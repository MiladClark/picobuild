import { useCallback } from 'react'
import { toast } from 'sonner'
import { useProjectStore } from '@renderer/stores/project-store'
import { createAssetsFromPaths } from '@renderer/lib/import-assets'

export function useImportAssets(): {
  pickAndImport: () => Promise<void>
  importPaths: (paths: string[]) => Promise<void>
} {
  const project = useProjectStore((s) => s.project)
  const addAssets = useProjectStore((s) => s.addAssets)

  const importPaths = useCallback(
    async (paths: string[]): Promise<void> => {
      if (!project || paths.length === 0) return
      try {
        const newAssets = await createAssetsFromPaths(paths, project)
        if (newAssets.length === 0) {
          toast.error('No valid images found')
          return
        }
        addAssets(newAssets)
        toast.success(`Imported ${newAssets.length} image(s)`)
      } catch (e) {
        toast.error(String(e))
      }
    },
    [project, addAssets]
  )

  const pickAndImport = useCallback(async (): Promise<void> => {
    const paths = await window.api.image.pick()
    await importPaths(paths)
  }, [importPaths])

  return { pickAndImport, importPaths }
}
