-- Atomic transfers (issue #115, part 1):
--   `transferCurrency` and `transferInventoryItem` previously issued their
--   debit/credit (resp. source/destination) writes as two separate supabase-js
--   calls — i.e. two separate HTTP requests / transactions. A failure between
--   them lost money/items, and two concurrent currency transfers from the same
--   balance could both pass the JS-side `balance >= amount` check (money
--   created). These functions move each transfer into a single transaction.
--
--   SECURITY INVOKER (the default) is deliberate: a function called via one
--   `.rpc()` is already a single transaction (atomicity), and running as the
--   caller means the existing characters/game_state RLS UPDATE policies enforce
--   who may debit/credit — no auth duplication. `set search_path = ''` + fully
--   schema-qualified objects per repo convention.

create or replace function public.transfer_currency(
  p_from_type text,
  p_from_id   uuid,
  p_to_type   text,
  p_to_id     uuid,
  p_kind      text,
  p_amount    int
)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows int;
begin
  if p_amount < 1 then
    raise exception 'Amount must be at least 1';
  end if;
  if p_kind not in ('credits', 'assets') then
    raise exception 'Invalid currency kind: %', p_kind;
  end if;
  if p_from_type not in ('character', 'game')
     or p_to_type not in ('character', 'game') then
    raise exception 'Invalid owner type';
  end if;

  -- Debit, race-safe: the `>= amount` guard lives in the WHERE so two
  -- concurrent transfers can't both pass it (row lock serializes them).
  -- The currency column is dynamic but whitelisted above, so %I is safe.
  if p_from_type = 'character' then
    execute format(
      'update public.characters set %1$I = %1$I - $1 where id = $2 and %1$I >= $1',
      p_kind
    ) using p_amount, p_from_id;
  else
    execute format(
      'update public.game_state set %1$I = %1$I - $1 where game_id = $2 and %1$I >= $1',
      p_kind
    ) using p_amount, p_from_id;
  end if;
  get diagnostics v_rows = row_count;
  -- 0 rows means either insufficient balance or RLS filtered the source row
  -- out (caller not permitted to debit it). Both are safe to report as below.
  if v_rows = 0 then
    raise exception 'Not enough % to transfer', p_kind;
  end if;

  -- Credit.
  if p_to_type = 'character' then
    execute format(
      'update public.characters set %1$I = %1$I + $1 where id = $2',
      p_kind
    ) using p_amount, p_to_id;
  else
    execute format(
      'update public.game_state set %1$I = %1$I + $1 where game_id = $2',
      p_kind
    ) using p_amount, p_to_id;
  end if;
  get diagnostics v_rows = row_count;
  -- 0 rows: recipient missing, or RLS blocked the credit to an existing row.
  if v_rows = 0 then
    raise exception 'Recipient not found or not permitted';
  end if;

  return p_amount;
end;
$$;

revoke execute on function public.transfer_currency(text, uuid, text, uuid, text, int)
  from public, anon;
grant execute on function public.transfer_currency(text, uuid, text, uuid, text, int)
  to authenticated;

-- The find/partial-split/strip-`equipped` logic stays in the JS handler (it's
-- fiddly and already correct); this function only commits both writes in one
-- transaction — the actual hazard. The source array is replaced wholesale with
-- the caller-computed post-removal array (so it retains the general JSONB-blob
-- clobber risk for two concurrent edits to the *same* source inventory — that's
-- the broader part-3 concern, out of scope). The destination is appended via
-- concat so concurrent destination writers don't clobber each other.
create or replace function public.transfer_inventory_item(
  p_from_type           text,
  p_from_id             uuid,
  p_new_from_inventory  jsonb,
  p_to_type             text,
  p_to_id               uuid,
  p_moved_item          jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows int;
begin
  if p_from_type not in ('character', 'game')
     or p_to_type not in ('character', 'game') then
    raise exception 'Invalid owner type';
  end if;

  if p_from_type = 'character' then
    update public.characters set inventory = p_new_from_inventory
      where id = p_from_id;
  else
    update public.game_state set inventory = p_new_from_inventory
      where game_id = p_from_id;
  end if;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Source not found or not permitted';
  end if;

  if p_to_type = 'character' then
    update public.characters
      set inventory = coalesce(inventory, '[]'::jsonb) || jsonb_build_array(p_moved_item)
      where id = p_to_id;
  else
    update public.game_state
      set inventory = coalesce(inventory, '[]'::jsonb) || jsonb_build_array(p_moved_item)
      where game_id = p_to_id;
  end if;
  get diagnostics v_rows = row_count;
  -- 0 rows: recipient missing, or RLS blocked the append to an existing row.
  if v_rows = 0 then
    raise exception 'Recipient not found or not permitted';
  end if;
end;
$$;

revoke execute on function public.transfer_inventory_item(text, uuid, jsonb, text, uuid, jsonb)
  from public, anon;
grant execute on function public.transfer_inventory_item(text, uuid, jsonb, text, uuid, jsonb)
  to authenticated;
