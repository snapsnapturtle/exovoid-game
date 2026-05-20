import { getSupabaseBrowserClient } from '~/lib/supabase/client'

const BUCKET = 'character-portraits'
const MAX_DIMENSION = 512
const WEBP_QUALITY = 0.85
const MAX_SOURCE_BYTES = 10 * 1024 * 1024

export class PortraitError extends Error {}

export async function resizePortrait(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new PortraitError('Please choose an image file.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new PortraitError('Image must be 10 MB or smaller.')
  }

  const bitmap = await loadBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const sx = Math.floor((bitmap.width - side) / 2)
    const sy = Math.floor((bitmap.height - side) / 2)
    const targetSide = Math.min(side, MAX_DIMENSION)

    const canvas = document.createElement('canvas')
    canvas.width = targetSide
    canvas.height = targetSide
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new PortraitError('Browser cannot resize images.')
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, targetSide, targetSide)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new PortraitError('Could not encode portrait.'))
        },
        'image/webp',
        WEBP_QUALITY,
      )
    })
  } finally {
    if ('close' in bitmap) bitmap.close()
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return await createImageBitmap(file)
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new PortraitError('Could not decode image.'))
      el.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function uploadPortrait(
  characterId: string,
  file: File,
): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const blob = await resizePortrait(file)

  const filename = `${crypto.randomUUID()}.webp`
  const path = `${characterId}/${filename}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    })
  if (uploadError) throw new PortraitError(uploadError.message)

  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list(characterId)
  const stale = (existing ?? [])
    .map((o) => `${characterId}/${o.name}`)
    .filter((p) => p !== path)
  if (stale.length > 0) {
    await supabase.storage.from(BUCKET).remove(stale)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
