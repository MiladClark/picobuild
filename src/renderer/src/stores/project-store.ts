import { create } from 'zustand'
import type { ImageAsset, Project } from '@shared/types/project'

interface ProjectState {
  project: Project | null
  isDirty: boolean
  selectedAssetId: string | null
  recentProjects: Array<{ filePath: string; name: string; updatedAt: string }>
  setProject: (project: Project | null) => void
  updateProject: (partial: Partial<Project>) => void
  markDirty: () => void
  markClean: () => void
  setSelectedAssetId: (id: string | null) => void
  addAssets: (assets: ImageAsset[]) => void
  updateAsset: (id: string, partial: Partial<ImageAsset>) => void
  removeAssets: (ids: string[]) => void
  setRecentProjects: (
    projects: Array<{ filePath: string; name: string; updatedAt: string }>
  ) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  isDirty: false,
  selectedAssetId: null,
  recentProjects: [],
  setProject: (project) =>
    set({
      project,
      isDirty: false,
      selectedAssetId: project?.assets[0]?.id ?? null
    }),
  updateProject: (partial) => {
    const current = get().project
    if (!current) return
    set({
      project: { ...current, ...partial, updatedAt: new Date().toISOString() },
      isDirty: true
    })
  },
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
  addAssets: (assets) => {
    const current = get().project
    if (!current) return
    set({
      project: {
        ...current,
        assets: [...current.assets, ...assets],
        updatedAt: new Date().toISOString()
      },
      isDirty: true,
      selectedAssetId: assets[0]?.id ?? get().selectedAssetId
    })
  },
  updateAsset: (id, partial) => {
    const current = get().project
    if (!current) return
    set({
      project: {
        ...current,
        assets: current.assets.map((a) => (a.id === id ? { ...a, ...partial } : a)),
        updatedAt: new Date().toISOString()
      },
      isDirty: true
    })
  },
  removeAssets: (ids) => {
    const current = get().project
    if (!current) return
    const remaining = current.assets.filter((a) => !ids.includes(a.id))
    set({
      project: { ...current, assets: remaining, updatedAt: new Date().toISOString() },
      isDirty: true,
      selectedAssetId: remaining[0]?.id ?? null
    })
  },
  setRecentProjects: (projects) => set({ recentProjects: projects })
}))
