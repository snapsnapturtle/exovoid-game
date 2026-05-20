import { useRef } from 'react'

type PortraitSize = 'sm' | 'md'

interface CharacterPortraitProps {
  name: string
  portraitUrl: string | null
  size: PortraitSize
  canEdit?: boolean
  onUpload?: (file: File) => void
  uploading?: boolean
}

const SIZE_CLASSES: Record<PortraitSize, string> = {
  sm: 'h-12 w-12 text-sm',
  md: 'h-20 w-20 text-2xl',
}

export function CharacterPortrait({
  name,
  portraitUrl,
  size,
  canEdit = false,
  onUpload,
  uploading = false,
}: CharacterPortraitProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const interactive = canEdit && !!onUpload
  const sizeClass = SIZE_CLASSES[size]

  function handleClick() {
    if (!interactive || uploading) return
    inputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file && onUpload) onUpload(file)
  }

  const inner = portraitUrl ? (
    <img
      src={portraitUrl}
      alt={name ? `${name} portrait` : 'Character portrait'}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-accent-700/15 font-semibold text-accent-900">
      {initials(name)}
    </div>
  )

  const wrapperClass = `relative shrink-0 overflow-hidden rounded-xl border border-gray-400 ${sizeClass}`

  if (!interactive) {
    return <div className={wrapperClass}>{inner}</div>
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={uploading}
      aria-label={portraitUrl ? 'Change portrait' : 'Upload portrait'}
      className={`${wrapperClass} group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-900 disabled:cursor-not-allowed`}
    >
      {inner}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition group-not-disabled:group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {uploading ? '…' : 'Change'}
      </span>
      {uploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
          Uploading…
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
      />
    </button>
  )
}

function initials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '')
  return letters.join('') || '?'
}
