import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { PicoBuildAPI } from '../shared/api'
import type { Project } from '../shared/types/project'

const api: PicoBuildAPI = {
  app: {
    resourcesPath: () => ipcRenderer.invoke('app:resourcesPath'),
    sampleImages: () => ipcRenderer.invoke('app:sampleImages')
  },
  project: {
    listRecent: () => ipcRenderer.invoke('project:listRecent'),
    create: (name?: string) => ipcRenderer.invoke('project:create', name),
    open: () => ipcRenderer.invoke('project:open'),
    openPath: (filePath: string) => ipcRenderer.invoke('project:openPath', filePath),
    save: (project: Project) => ipcRenderer.invoke('project:save', project),
    duplicate: (filePath: string) => ipcRenderer.invoke('project:duplicate', filePath),
    delete: (filePath: string) => ipcRenderer.invoke('project:delete', filePath)
  },
  image: {
    pick: () => ipcRenderer.invoke('image:pick'),
    metadata: (filePath: string) => ipcRenderer.invoke('image:metadata', filePath),
    thumbnail: (filePath: string) => ipcRenderer.invoke('image:thumbnail', filePath),
    preview: (filePath: string) => ipcRenderer.invoke('image:preview', filePath),
    exists: (filePath: string) => ipcRenderer.invoke('image:exists', filePath),
    isImage: (filePath: string) => ipcRenderer.invoke('image:isImage', filePath),
    detectSubject: (filePath: string) => ipcRenderer.invoke('image:detectSubject', filePath)
  },
  dialog: {
    pickOutputDir: () => ipcRenderer.invoke('dialog:pickOutputDir')
  },
  export: {
    estimate: (project, count) => ipcRenderer.invoke('export:estimate', project, count),
    start: (project, assetIds, outputDir) =>
      ipcRenderer.invoke('export:start', project, assetIds, outputDir),
    cancel: (jobId) => ipcRenderer.invoke('export:cancel', jobId),
    onProgress: (cb) => {
      const handler = (_: unknown, p: unknown): void => cb(p as Parameters<typeof cb>[0])
      ipcRenderer.on('export:progress', handler)
      return () => ipcRenderer.removeListener('export:progress', handler)
    },
    onComplete: (cb) => {
      const handler = (_: unknown, data: unknown): void => cb(data as Parameters<typeof cb>[0])
      ipcRenderer.on('export:complete', handler)
      return () => ipcRenderer.removeListener('export:complete', handler)
    }
  },
  background: {
    remove: (sourcePath, assetId) => ipcRenderer.invoke('background:remove', sourcePath, assetId),
    onProgress: (cb) => {
      const handler = (_: unknown, p: unknown): void => cb(p as Parameters<typeof cb>[0])
      ipcRenderer.on('background:progress', handler)
      return () => ipcRenderer.removeListener('background:progress', handler)
    }
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (cb) => {
      const handler = (_: unknown, maximized: boolean): void => cb(maximized)
      ipcRenderer.on('window:maximized-change', handler)
      return () => ipcRenderer.removeListener('window:maximized-change', handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error legacy
  window.electron = electronAPI
  // @ts-expect-error legacy
  window.api = api
}
