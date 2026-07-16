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
  const seen = new Map<string, number>()
  return names.map((name) => {
    const count = seen.get(name) ?? 0
    seen.set(name, count + 1)
    if (count === 0) return name
    const dot = name.lastIndexOf('.')
    if (dot === -1) return `${name}-${count}`
    return `${name.slice(0, dot)}-${count}${name.slice(dot)}`
  })
}
