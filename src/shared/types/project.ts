export type Unit = 'px' | 'inch' | 'cm' | 'percent'

export type BackgroundType = 'color' | 'transparent' | 'gradient' | 'image'

export interface BackgroundConfig {
  type: BackgroundType
  value: string
  gradientEnd?: string
  imagePath?: string
}

export interface CanvasConfig {
  width: number
  height: number
  unit: Unit
  dpi: number
  aspectLock: boolean
  background: BackgroundConfig
}

export interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ImageCrop {
  x: number
  y: number
  width: number
  height: number
}

export interface Transform {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  flipX: boolean
  flipY: boolean
  crop?: ImageCrop
}

export interface Adjustments {
  brightness: number
  exposure: number
  contrast: number
  saturation: number
  vibrance: number
  highlights: number
  shadows: number
  whites: number
  blacks: number
  temperature: number
  tint: number
  hue: number
  sharpness: number
  blur: number
}

export type AssetStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'missing'

export interface ImageAsset {
  id: string
  sourcePath: string
  displayName: string
  transform: Transform
  adjustments: Adjustments
  status: AssetStatus
  processedPath?: string
  backgroundRemoved?: boolean
}

export type ExportFormat = 'png' | 'jpg' | 'webp' | 'avif'

export interface ExportSettings {
  format: ExportFormat
  quality: number
  renamePattern: string
  outputDir?: string
}

export interface Preset {
  id: string
  name: string
  canvas: Pick<CanvasConfig, 'width' | 'height' | 'unit' | 'dpi'>
  margins?: Margins
  exportSettings?: Partial<ExportSettings>
}

export interface Project {
  schemaVersion: number
  id: string
  name: string
  filePath?: string
  createdAt: string
  updatedAt: string
  canvas: CanvasConfig
  margins: Margins
  assets: ImageAsset[]
  presets: Preset[]
  exportSettings: ExportSettings
}

export interface RecentProject {
  filePath: string
  name: string
  updatedAt: string
}

export interface ImageMetadata {
  name: string
  format: string
  width: number
  height: number
  size: number
  path: string
}

export interface ExportJobItem {
  assetId: string
  fileName: string
  status: AssetStatus
  error?: string
  outputPath?: string
}

export interface ExportJob {
  id: string
  items: ExportJobItem[]
  progress: number
  cancelled: boolean
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  exposure: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  hue: 0,
  sharpness: 0,
  blur: 0
}

export const DEFAULT_MARGINS: Margins = { top: 40, right: 40, bottom: 40, left: 40 }

export function createDefaultProject(name: string, id: string): Project {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    canvas: {
      width: 1080,
      height: 1080,
      unit: 'px',
      dpi: 72,
      aspectLock: true,
      background: { type: 'color', value: '#FFFFFF' }
    },
    margins: { ...DEFAULT_MARGINS },
    assets: [],
    presets: [],
    exportSettings: {
      format: 'webp',
      quality: 85,
      renamePattern: '{project-name}-{index}'
    }
  }
}
