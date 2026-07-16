import {
  MousePointer2,
  Move,
  Crop,
  FlipHorizontal,
  FlipVertical,
  ArrowLeftRight,
  ArrowUpDown,
  Grid3x3,
  Ruler,
  Magnet,
  Sparkles
} from 'lucide-react'
import { useAppStore } from '@renderer/stores/app-store'
import { useProjectStore } from '@renderer/stores/project-store'
import { useEditorStore } from '@renderer/stores/editor-store'
import { ToolbarButton, ToolbarDivider } from '@renderer/components/ui'
import { useAlignActions } from '@renderer/hooks/use-align-actions'

export function BuilderLeftPanel(): React.JSX.Element | null {
  const { activeTool, setActiveTool } = useAppStore()

  const project = useProjectStore((s) => s.project)
  const selectedAssetId = useProjectStore((s) => s.selectedAssetId)
  const updateAsset = useProjectStore((s) => s.updateAsset)
  const pushHistory = useEditorStore((s) => s.pushHistory)
  const {
    showGrid,
    showRuler,
    snapToGrid,
    smartGuides,
    setShowGrid,
    setShowRuler,
    setSnapToGrid,
    setSmartGuides
  } = useEditorStore()

  const { hasAsset, applyAlign } = useAlignActions()

  if (!project) return null

  const asset = project.assets.find((a) => a.id === selectedAssetId)

  const pushAssetHistory = (): void => {
    if (!asset) return
    pushHistory({
      assetId: asset.id,
      transform: { ...asset.transform },
      adjustments: { ...asset.adjustments }
    })
  }

  const viewTools = (
    <>
      <ToolbarButton active={showGrid} title="Grid" onClick={() => setShowGrid(!showGrid)}>
        <Grid3x3 size={15} />
      </ToolbarButton>
      <ToolbarButton active={showRuler} title="Ruler" onClick={() => setShowRuler(!showRuler)}>
        <Ruler size={15} />
      </ToolbarButton>
      <ToolbarButton
        active={snapToGrid}
        title="Snap to grid"
        onClick={() => setSnapToGrid(!snapToGrid)}
      >
        <Magnet size={15} />
      </ToolbarButton>
      <ToolbarButton
        active={smartGuides}
        title="Smart guides"
        onClick={() => setSmartGuides(!smartGuides)}
      >
        <Sparkles size={15} />
      </ToolbarButton>
    </>
  )

  const selectionTools = (
    <>
      <ToolbarButton
        active={activeTool === 'select'}
        title="Select (V)"
        onClick={() => setActiveTool('select')}
      >
        <MousePointer2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        active={activeTool === 'move'}
        title="Move (M)"
        onClick={() => setActiveTool('move')}
      >
        <Move size={15} />
      </ToolbarButton>
      <ToolbarButton
        active={activeTool === 'crop'}
        disabled={!hasAsset}
        title="Crop (C)"
        onClick={() => setActiveTool('crop')}
      >
        <Crop size={15} />
      </ToolbarButton>
    </>
  )

  const transformTools = (
    <>
      <ToolbarButton
        disabled={!hasAsset}
        title="Flip horizontal"
        onClick={() => {
          if (!asset) return
          pushAssetHistory()
          updateAsset(asset.id, {
            transform: { ...asset.transform, flipX: !asset.transform.flipX }
          })
        }}
      >
        <FlipHorizontal size={15} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasAsset}
        title="Flip vertical"
        onClick={() => {
          if (!asset) return
          pushAssetHistory()
          updateAsset(asset.id, {
            transform: { ...asset.transform, flipY: !asset.transform.flipY }
          })
        }}
      >
        <FlipVertical size={15} />
      </ToolbarButton>
      <ToolbarButton disabled={!hasAsset} title="Fit width" onClick={() => applyAlign('fit-width')}>
        <ArrowLeftRight size={15} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasAsset}
        title="Fit height"
        onClick={() => applyAlign('fit-height')}
      >
        <ArrowUpDown size={15} />
      </ToolbarButton>
    </>
  )

  return (
    <aside className="tool-rail">
      <div className="tool-rail-group no-scrollbar min-h-0 w-full flex-1 overflow-y-auto">
        {selectionTools}
        <ToolbarDivider />
        {transformTools}
      </div>
      <div className="tool-rail-footer">{viewTools}</div>
    </aside>
  )
}
