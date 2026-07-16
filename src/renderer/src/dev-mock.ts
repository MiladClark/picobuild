/**
 * Dev-only browser stub for the Electron preload bridge.
 *
 * When the renderer is opened in a plain browser (e.g. Vite dev at :3013 for
 * visual UI work) the `window.api` / `window.electron` bridges injected by the
 * preload script are absent. This module fills them with harmless placeholder
 * data so pages render and the layout can be inspected. It self-guards: inside
 * the real Electron app `window.api` already exists, so nothing here runs, and
 * in production builds the whole module is dead-code eliminated.
 */
import { createDefaultProject, DEFAULT_ADJUSTMENTS } from '@shared/types/project'
import type { ImageAsset, Project } from '@shared/types/project'

if (import.meta.env.DEV && !('api' in window)) {
  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750"><rect width="1000" height="750" fill="#3b3b44"/><circle cx="500" cy="375" r="180" fill="#6366f1"/><text x="500" y="390" font-size="60" fill="#fff" text-anchor="middle" font-family="sans-serif">SAMPLE</text></svg>`
    )

  const makeAsset = (name: string): ImageAsset => ({
    id: Math.random().toString(36).slice(2),
    sourcePath: `C:\\Users\\demo\\${name}`,
    displayName: name,
    transform: { x: 40, y: 40, width: 900, height: 675, rotation: 0, flipX: false, flipY: false },
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    status: 'completed'
  })

  const makeProject = (name = 'Demo Project'): Project => {
    const p = createDefaultProject(name, Math.random().toString(36).slice(2))
    p.filePath = `C:\\Users\\demo\\Desktop\\${name}.picobuild.json`
    p.assets = [makeAsset('cpu-front.png'), makeAsset('cpu-angle.png'), makeAsset('cpu-top.png')]
    return p
  }

  const recent = [
    {
      filePath: 'C:\\Users\\demo\\Desktop\\catalog.picobuild.json',
      name: 'Summer catalog',
      updatedAt: new Date().toISOString()
    },
    {
      filePath: 'C:\\Users\\demo\\Desktop\\watches.picobuild.json',
      name: 'Watch shots',
      updatedAt: new Date().toISOString()
    }
  ]

  const noop = (): void => {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).electron = {
    process: { platform: 'win32', versions: { electron: 'dev', chrome: 'dev', node: 'dev' } },
    ipcRenderer: { on: noop, send: noop, invoke: async () => undefined, removeListener: noop }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).api = {
    app: {
      resourcesPath: async () => 'C:\\resources',
      sampleImages: async () => ['C:\\sample1.png', 'C:\\sample2.png']
    },
    project: {
      listRecent: async () => recent,
      create: async (name?: string) => {
        const project = makeProject(name || 'Untitled Project')
        return { project, filePath: project.filePath! }
      },
      open: async () => {
        const project = makeProject('Opened Project')
        return { project, filePath: project.filePath! }
      },
      openPath: async () => makeProject('Summer catalog'),
      save: async (p: Project) => p,
      duplicate: async () => {
        const project = makeProject('Copy')
        return { project, filePath: project.filePath! }
      },
      delete: async () => undefined
    },
    image: {
      pick: async () => [],
      metadata: async (filePath: string) => ({
        name: filePath.split('\\').pop() || 'image.png',
        format: 'png',
        width: 1000,
        height: 750,
        size: 482_100,
        path: filePath
      }),
      thumbnail: async () => placeholder,
      preview: async () => placeholder,
      exists: async () => true,
      isImage: async () => true,
      detectSubject: async () => ({
        left: 120,
        top: 90,
        right: 880,
        bottom: 660,
        width: 760,
        height: 570,
        imageWidth: 1000,
        imageHeight: 750
      })
    },
    dialog: { pickOutputDir: async () => 'C:\\Users\\demo\\Desktop\\1x' },
    export: {
      estimate: async () => 482_100,
      start: async () => 'dev-job',
      cancel: async () => undefined,
      onProgress: () => noop,
      onComplete: () => noop
    },
    background: {
      remove: async () => 'C:\\Users\\demo\\.picobuild-cache\\out-nobg.png',
      onProgress: () => noop
    },
    window: {
      minimize: async () => undefined,
      toggleMaximize: async () => false,
      close: async () => undefined,
      isMaximized: async () => false,
      onMaximizedChange: () => noop
    }
  }
}
