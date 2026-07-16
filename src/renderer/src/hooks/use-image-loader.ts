import { useEffect, useState } from 'react'

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

const previewCache = new Map<string, string>()

export function useImagePreview(filePath: string | undefined): {
  image: HTMLImageElement | null
  state: LoadState
  error: string | null
} {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filePath) {
      setImage(null)
      setState('idle')
      setError(null)
      return
    }

    let cancelled = false
    setState('loading')
    setError(null)

    const load = async (): Promise<void> => {
      try {
        let dataUrl = previewCache.get(filePath)
        if (!dataUrl) {
          const exists = await window.api.image.exists(filePath)
          if (!exists) throw new Error('File not found on disk')
          dataUrl = await window.api.image.preview(filePath)
          previewCache.set(filePath, dataUrl)
        }

        if (cancelled) return

        const img = new window.Image()
        img.onload = () => {
          if (!cancelled) {
            setImage(img)
            setState('loaded')
          }
        }
        img.onerror = () => {
          if (!cancelled) {
            setImage(null)
            setState('error')
            setError('Failed to decode image')
          }
        }
        img.src = dataUrl
      } catch (err) {
        if (!cancelled) {
          setImage(null)
          setState('error')
          setError(String(err))
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [filePath])

  return { image, state, error }
}

export function clearImagePreviewCache(): void {
  previewCache.clear()
}

export function invalidateImagePreview(filePath: string): void {
  previewCache.delete(filePath)
}

export async function loadThumbnail(filePath: string): Promise<string> {
  const cached = previewCache.get(`thumb:${filePath}`)
  if (cached) return cached
  const thumb = await window.api.image.thumbnail(filePath)
  previewCache.set(`thumb:${filePath}`, thumb)
  return thumb
}
