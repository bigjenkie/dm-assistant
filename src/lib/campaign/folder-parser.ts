export type FileEntry = {
  path: string
  content: string
}

type NamedContent = {
  name: string
  content: string
}

export type CampaignFolderData = {
  context: string
  characters: NamedContent[]
  npcs: NamedContent[]
  plotHooks: string
  encounters: string
  toContext: () => string
  toBackstories: () => string
}

const TEXT_EXTENSIONS = new Set(['.md', '.txt'])

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/')
}

function getExtension(p: string): string {
  const dot = p.lastIndexOf('.')
  return dot >= 0 ? p.slice(dot).toLowerCase() : ''
}

function getFilename(p: string): string {
  const normalized = normalizePath(p)
  const base = normalized.split('/').pop() ?? ''
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}

function isTextFile(p: string): boolean {
  return TEXT_EXTENSIONS.has(getExtension(p))
}

function getDir(p: string): string {
  const normalized = normalizePath(p)
  const parts = normalized.split('/')
  return parts.length > 1 ? parts[parts.length - 2] : ''
}

export function parseCampaignFolder(files: FileEntry[]): CampaignFolderData {
  let context = ''
  const characters: NamedContent[] = []
  const npcs: NamedContent[] = []
  let plotHooks = ''
  let encounters = ''

  for (const file of files) {
    const normalized = normalizePath(file.path)
    const filename = getFilename(normalized)
    const dir = getDir(normalized)

    if (!isTextFile(normalized)) continue

    // Root-level known files
    if (dir === '' || dir === '.') {
      if (filename === 'campaign') {
        context = file.content
      } else if (filename === 'plot-hooks') {
        plotHooks = file.content
      } else if (filename === 'encounters') {
        encounters = file.content
      }
      continue
    }

    // Directory-based files
    if (dir === 'characters') {
      characters.push({ name: filename, content: file.content })
    } else if (dir === 'npcs') {
      npcs.push({ name: filename, content: file.content })
    }
  }

  return {
    context,
    characters,
    npcs,
    plotHooks,
    encounters,

    toContext() {
      const sections: string[] = []
      if (context) sections.push(context)
      if (npcs.length > 0) {
        sections.push('NPCs:\n' + npcs.map((n) => n.content).join('\n\n'))
      }
      if (plotHooks) sections.push('Plot Hooks:\n' + plotHooks)
      if (encounters) sections.push('Encounters:\n' + encounters)
      return sections.join('\n\n')
    },

    toBackstories() {
      if (characters.length === 0) return ''
      return characters.map((c) => c.content).join('\n\n')
    },
  }
}
