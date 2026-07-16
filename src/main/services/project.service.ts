import { z } from 'zod'
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { dialog } from 'electron'
import type { Project, RecentProject } from '../../shared/types/project'
import { createDefaultProject } from '../../shared/types/project'

const projectSchema = z.object({
  schemaVersion: z.number(),
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  canvas: z.object({
    width: z.number(),
    height: z.number(),
    unit: z.enum(['px', 'inch', 'cm', 'percent']),
    dpi: z.number(),
    aspectLock: z.boolean(),
    background: z.object({
      type: z.enum(['color', 'transparent', 'gradient', 'image']),
      value: z.string(),
      gradientEnd: z.string().optional(),
      imagePath: z.string().optional()
    })
  }),
  margins: z.object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number()
  }),
  assets: z.array(z.any()),
  presets: z.array(z.any()),
  exportSettings: z.object({
    format: z.enum(['png', 'jpg', 'webp', 'avif']),
    quality: z.number(),
    renamePattern: z.string(),
    outputDir: z.string().optional()
  })
})

function getAppDataDir(): string {
  const dir = join(app.getPath('userData'), 'picobuild')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getRecentPath(): string {
  return join(getAppDataDir(), 'recent.json')
}

function readRecent(): RecentProject[] {
  const path = getRecentPath()
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as RecentProject[]
  } catch {
    return []
  }
}

function writeRecent(list: RecentProject[]): void {
  writeFileSync(getRecentPath(), JSON.stringify(list, null, 2), 'utf-8')
}

function addToRecent(project: Project, filePath: string): void {
  const list = readRecent().filter((r) => r.filePath !== filePath)
  list.unshift({
    filePath,
    name: project.name,
    updatedAt: project.updatedAt
  })
  writeRecent(list.slice(0, 20))
}

export function listRecentProjects(): RecentProject[] {
  return readRecent().filter((r) => existsSync(r.filePath))
}

export async function createProject(name?: string): Promise<{ project: Project; filePath: string } | null> {
  const result = await dialog.showSaveDialog({
    title: 'Create Project',
    defaultPath: `${name || 'untitled-project'}.picobuild.json`,
    filters: [{ name: 'PicoBuild Project', extensions: ['picobuild.json', 'json'] }]
  })
  if (result.canceled || !result.filePath) return null

  const id = randomUUID()
  const project = createDefaultProject(name || 'Untitled Project', id)
  const filePath = result.filePath
  project.filePath = filePath
  writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8')
  addToRecent(project, filePath)
  return { project, filePath }
}

export async function openProject(): Promise<{ project: Project; filePath: string } | null> {
  const result = await dialog.showOpenDialog({
    title: 'Open Project',
    filters: [{ name: 'PicoBuild Project', extensions: ['picobuild.json', 'json'] }],
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths[0]) return null
  return openProjectPath(result.filePaths[0])
}

export function openProjectPath(filePath: string): { project: Project; filePath: string } {
  const raw = readFileSync(filePath, 'utf-8')
  const parsed = projectSchema.parse(JSON.parse(raw)) as Project
  parsed.filePath = filePath
  addToRecent(parsed, filePath)
  return { project: parsed, filePath }
}

export function saveProject(project: Project): Project {
  if (!project.filePath) throw new Error('Project has no file path')
  const updated = { ...project, updatedAt: new Date().toISOString() }
  writeFileSync(project.filePath, JSON.stringify(updated, null, 2), 'utf-8')
  addToRecent(updated, project.filePath)
  return updated
}

export async function duplicateProject(filePath: string): Promise<{ project: Project; filePath: string } | null> {
  const { project } = openProjectPath(filePath)
  const result = await dialog.showSaveDialog({
    title: 'Duplicate Project',
    defaultPath: `${project.name}-copy.picobuild.json`,
    filters: [{ name: 'PicoBuild Project', extensions: ['picobuild.json', 'json'] }]
  })
  if (result.canceled || !result.filePath) return null

  const copy = {
    ...project,
    id: randomUUID(),
    name: `${project.name} (Copy)`,
    filePath: result.filePath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  writeFileSync(result.filePath, JSON.stringify(copy, null, 2), 'utf-8')
  addToRecent(copy, result.filePath)
  return { project: copy, filePath: result.filePath }
}

export function deleteProject(filePath: string): void {
  if (existsSync(filePath)) unlinkSync(filePath)
  const list = readRecent().filter((r) => r.filePath !== filePath)
  writeRecent(list)
}

export async function pickImages(): Promise<string[]> {
  const result = await dialog.showOpenDialog({
    title: 'Import Images',
    filters: [
      {
        name: 'Images',
        extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'tif']
      }
    ],
    properties: ['openFile', 'multiSelections']
  })
  if (result.canceled) return []
  return result.filePaths
}

export async function pickOutputDir(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Select Output Folder',
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
}
