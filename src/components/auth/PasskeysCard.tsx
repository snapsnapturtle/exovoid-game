import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { Input } from '~/components/ui/Input'
import { SettingsCard } from '~/components/ui/SettingsCard'

type Passkey = {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

// WebAuthn is unavailable in non-secure contexts and older browsers.
const passkeysSupported =
  typeof window !== 'undefined' && !!window.PublicKeyCredential

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Maps Supabase passkey error codes to user-facing copy. */
function describeError(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case 'webauthn_credential_exists':
      return 'This device already has a passkey for your account.'
    case 'too_many_passkeys':
      return "You've reached the maximum number of passkeys."
    case 'passkey_disabled':
      return 'Passkey sign-in is not enabled for this project.'
    default:
      return error.message || 'Something went wrong with that passkey.'
  }
}

export function PasskeysCard() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.auth.passkey.list()
    if (error) {
      setError(describeError(error))
    } else {
      setPasskeys(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (passkeysSupported) {
      void refresh()
    } else {
      setLoading(false)
    }
  }, [])

  async function handleAdd() {
    setError(null)
    setRegistering(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.registerPasskey()
    if (error) {
      // A cancelled or timed-out ceremony surfaces as an abort/NotAllowed
      // DOMError — not an error worth showing the user.
      const name = (error as { name?: string }).name
      if (name !== 'NotAllowedError' && name !== 'AbortError') {
        setError(describeError(error))
      }
      setRegistering(false)
      return
    }
    await refresh()
    setRegistering(false)
  }

  async function handleDelete(passkeyId: string) {
    setError(null)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.passkey.delete({ passkeyId })
    if (error) {
      setError(describeError(error))
      return
    }
    await refresh()
  }

  async function handleRename(passkeyId: string, friendlyName: string) {
    setError(null)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.passkey.update({
      passkeyId,
      friendlyName,
    })
    if (error) {
      setError(describeError(error))
      return
    }
    await refresh()
  }

  const description =
    "Sign in without a password using your device's biometrics or a security key."

  if (!passkeysSupported) {
    return (
      <SettingsCard title="Passkeys" description={description}>
        <p className="text-sm text-gray-900">
          This browser doesn't support passkeys.
        </p>
      </SettingsCard>
    )
  }

  return (
    <SettingsCard
      title="Passkeys"
      description={description}
      action={
        <Button type="button" disabled={registering} onClick={handleAdd}>
          {registering ? 'Waiting…' : 'Add a passkey'}
        </Button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-700">Loading passkeys…</p>
        ) : passkeys.length === 0 ? (
          <p className="text-sm text-gray-900">
            No passkeys yet. Add one to sign in without a password.
          </p>
        ) : (
          <ul className="divide-y divide-gray-400 rounded-lg border border-gray-400">
            {passkeys.map((passkey) => (
              <PasskeyRow
                key={passkey.id}
                passkey={passkey}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
        {error && <Alert variant="danger">{error}</Alert>}
      </div>
    </SettingsCard>
  )
}

function PasskeyRow({
  passkey,
  onRename,
  onDelete,
}: {
  passkey: Passkey
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(passkey.friendly_name ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === passkey.friendly_name) {
      setEditing(false)
      return
    }
    setBusy(true)
    await onRename(passkey.id, trimmed)
    setBusy(false)
    setEditing(false)
  }

  async function remove() {
    setBusy(true)
    await onDelete(passkey.id)
    // No setBusy(false): the row unmounts once the list refreshes.
  }

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        {editing ? (
          <Input
            size="sm"
            autoFocus
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-56"
          />
        ) : (
          <p className="truncate text-sm font-medium text-white">
            {passkey.friendly_name || 'Passkey'}
          </p>
        )}
        <p className="mt-0.5 text-xs text-gray-700">
          Added {formatDate(passkey.created_at)}
          {passkey.last_used_at &&
            ` · Last used ${formatDate(passkey.last_used_at)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {editing ? (
          <>
            <Button
              type="button"
              variant="subtle"
              size="sm"
              disabled={busy}
              onClick={save}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setName(passkey.friendly_name ?? '')
                setEditing(true)
              }}
            >
              Rename
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={remove}
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </li>
  )
}
