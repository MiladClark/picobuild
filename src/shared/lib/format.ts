export function formatRenamePattern(
  pattern: string,
  projectName: string,
  originalName: string,
  index: number
): string {
  const base = originalName.replace(/\.[^.]+$/, '')
  return pattern
    .replace(/\{project-name\}/g, projectName.replace(/\s+/g, '-').toLowerCase())
    .replace(/\{original-name\}/g, base)
    .replace(/\{index\}/g, String(index).padStart(3, '0'))
}

export function ensureUniqueNames(names: string[]): string[] {
  // Dedupe against already-EMITTED output names, not just previously-seen
  // input names — otherwise a raw name that happens to match a name we just
  // generated for an earlier collision (e.g. "shot.png", "shot.png",
  // "shot-1.png") still collides and one export silently overwrites another.
  const used = new Set<string>()
  return names.map((name) => {
    if (!used.has(name)) {
      used.add(name)
      return name
    }
    const dot = name.lastIndexOf('.')
    const base = dot === -1 ? name : name.slice(0, dot)
    const ext = dot === -1 ? '' : name.slice(dot)
    let candidate: string
    let n = 1
    do {
      candidate = `${base}-${n}${ext}`
      n++
    } while (used.has(candidate))
    used.add(candidate)
    return candidate
  })
}
