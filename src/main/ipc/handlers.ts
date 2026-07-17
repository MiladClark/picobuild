import { ipcMain, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { existsSync, readdirSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { randomUUID } from 'crypto'
import type { Project } from '../../shared/types/project'
import {
  createProject,
  openProject,
  openProjectPath,
  saveProject,
  duplicateProject,
  deleteProject,
  listRecentProjects,
  pickImages,
  pickOutputDir
} from '../services/project.service'
import {
  getImageMetadata,
  generateThumbnail,
  getImagePreviewDataUrl,
  fileExists,
  isImageFile
} from '../services/image.service'
import { exportAssets, cancelExportJob, estimateExportSize } from '../services/export.service'
import {
  removeBackgroundToFile,
  detectSubjectBounds,
  type RemovalOptions
} from '../services/background-removal.service'

export function registerIpcHandlers(): void {
  ipcMain.handle('app:resourcesPath', () => {
    const devPath = join(app.getAppPath(), 'resources')
    if (is.dev && existsSync(devPath)) return devPath
    return join(process.resourcesPath, 'resources')
  })

  ipcMain.handle('app:sampleImages', () => {
    const resourcesPath = is.dev
      ? join(app.getAppPath(), 'resources')
      : join(process.resourcesPath, 'resources')
    // Dedicated subfolder so app assets (icon, logo) living alongside it in
    // resources/ are never mistaken for demo product photos.
    const samplesPath = join(resourcesPath, 'samples')
    if (!existsSync(samplesPath)) return []
    return readdirSync(samplesPath)
      .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
      .map((f) => join(samplesPath, f))
  })

  ipcMain.handle('project:listRecent', () => listRecentProjects())

  ipcMain.handle('project:create', (_e, name?: string) => createProject(name))

  ipcMain.handle('project:open', () => openProject())

  ipcMain.handle('project:openPath', (_e, filePath: string) => {
    const result = openProjectPath(filePath)
    return result.project
  })

  ipcMain.handle('project:save', (_e, project: Project) => saveProject(project))

  ipcMain.handle('project:duplicate', (_e, filePath: string) => duplicateProject(filePath))

  ipcMain.handle('project:delete', (_e, filePath: string) => {
    deleteProject(filePath)
  })

  ipcMain.handle('image:pick', () => pickImages())

  ipcMain.handle('image:metadata', (_e, filePath: string) => getImageMetadata(filePath))

  ipcMain.handle('image:thumbnail', async (_e, filePath: string) => {
    const buffer = await generateThumbnail(filePath)
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  })

  ipcMain.handle('image:preview', async (_e, filePath: string) => getImagePreviewDataUrl(filePath))

  ipcMain.handle('image:exists', (_e, filePath: string) => fileExists(filePath))

  ipcMain.handle('image:isImage', (_e, filePath: string) => isImageFile(filePath))

  ipcMain.handle('dialog:pickOutputDir', () => pickOutputDir())

  ipcMain.handle('export:estimate', (_e, project: Project, count: number) =>
    estimateExportSize(project, count)
  )

  ipcMain.handle(
    'export:start',
    async (e, project: Project, assetIds: string[], outputDir: string) => {
      const jobId = randomUUID()
      const win = BrowserWindow.fromWebContents(e.sender)

      exportAssets(project, assetIds, outputDir, jobId, (progress) => {
        win?.webContents.send('export:progress', progress)
      })
        .then((results) => {
          win?.webContents.send('export:complete', { jobId, results })
        })
        .catch((err) => {
          win?.webContents.send('export:complete', {
            jobId,
            results: [],
            error: String(err)
          })
        })

      return jobId
    }
  )

  ipcMain.handle('export:cancel', (_e, jobId: string) => {
    cancelExportJob(jobId)
  })

  ipcMain.handle(
    'background:remove',
    async (e, sourcePath: string, assetId: string, options?: RemovalOptions) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      return removeBackgroundToFile(
        sourcePath,
        assetId,
        (progress) => {
          win?.webContents.send('background:progress', { assetId, progress, status: 'processing' })
        },
        options
      )
    }
  )

  ipcMain.handle('image:detectSubject', (_e, path: string) => detectSubjectBounds(path))

  ipcMain.handle('window:minimize', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.minimize()
  })

  ipcMain.handle('window:toggleMaximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return false
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return win.isMaximized()
  })

  ipcMain.handle('window:close', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.close()
  })

  ipcMain.handle('window:isMaximized', (e) => {
    return BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false
  })
}
