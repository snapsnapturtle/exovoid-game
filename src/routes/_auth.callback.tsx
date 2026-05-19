import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'

export const Route = createFileRoute('/_auth/callback')({
  component: CallbackPage,
})

function CallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate({ to: '/dashboard' })
      }
    })
  }, [navigate])

  return (
    <div className="text-center text-gray-900">
      <p>Confirming your account...</p>
    </div>
  )
}
