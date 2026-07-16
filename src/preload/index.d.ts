import { ElectronAPI } from '@electron-toolkit/preload'
import type { PicoBuildAPI } from '../shared/api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: PicoBuildAPI
  }
}

export {}
