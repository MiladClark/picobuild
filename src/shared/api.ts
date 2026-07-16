import type { Project, RecentProject, ImageMetadata } from '../shared/types/project'
import type { ExportProgress, ExportResult } from '../main/services/export.service'

export interface BgRemovalProgress {
  assetId: string
  progress: number
  status: 'processing' | 'completed' | 'failed'
  error?: string
}

export interface RemovalOptions {
  quality?: 'fast' | 'best'
  despeckle?: boolean
}

export interface SubjectBounds {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  imageWidth: number
  imageHeight: number
}

export interface PicoBuildAPI {
  app: {
    resourcesPath: () => Promise<string>
    sampleImages: () => Promise<string[]>
  }
  project: {
    listRecent: () => Promise<RecentProject[]>
    create: (name?: string) => Promise<{ project: Project; filePath: string } | null>
    open: () => Promise<{ project: Project; filePath: string } | null>
    openPath: (filePath: string) => Promise<Project>
    save: (project: Project) => Promise<Project>
    duplicate: (filePath: string) => Promise<{ project: Project; filePath: string } | null>
    delete: (filePath: string) => Promise<void>
  }
  image: {
    pick: () => Promise<string[]>
    metadata: (filePath: string) => Promise<ImageMetadata>
    thumbnail: (filePath: string) => Promise<string>
    preview: (filePath: string) => Promise<string>
    exists: (filePath: string) => Promise<boolean>
    isImage: (filePath: string) => Promise<boolean>
    detectSubject: (filePath: string) => Promise<SubjectBounds>
  }
  dialog: {
    pickOutputDir: () => Promise<string | null>
  }
  export: {
    estimate: (project: Project, count: number) => Promise<number>
    start: (project: Project, assetIds: string[], outputDir: string) => Promise<string>
    cancel: (jobId: string) => Promise<void>
    onProgress: (cb: (p: ExportProgress) => void) => () => void
    onComplete: (
      cb: (data: { jobId: string; results: ExportResult[]; error?: string }) => void
    ) => () => void
  }
  background: {
    remove: (sourcePath: string, assetId: string, options?: RemovalOptions) => Promise<string>
    onProgress: (cb: (p: BgRemovalProgress) => void) => () => void
  }
  window: {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<boolean>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
    onMaximizedChange: (cb: (maximized: boolean) => void) => () => void
  }
}
