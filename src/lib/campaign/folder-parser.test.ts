/**
 * TDD tests for campaign folder parser.
 *
 * The parser takes a list of { path, content } entries (abstracted from
 * filesystem or browser file picker) and returns structured campaign data.
 *
 * Expected folder convention:
 *   campaign.md          → campaign context (world, setting, rules)
 *   characters/
 *     vex.md             → character backstory
 *     drogan.md          → character backstory
 *   npcs/
 *     mayor-hild.md      → NPC details
 *     fendrel.md         → NPC details
 *   plot-hooks.md        → active plot hooks
 *   encounters.md        → planned encounters
 */
import { describe, it, expect } from 'vitest'
import { parseCampaignFolder } from './folder-parser'
import type { FileEntry } from './folder-parser'

describe('parseCampaignFolder', () => {
  // --- CAMPAIGN CONTEXT ---

  it('extracts campaign context from campaign.md at root', () => {
    const files: FileEntry[] = [
      { path: 'campaign.md', content: 'World: Forgotten Realms\nSystem: D&D 5e' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.context).toBe('World: Forgotten Realms\nSystem: D&D 5e')
  })

  it('extracts campaign context from campaign.txt', () => {
    const files: FileEntry[] = [
      { path: 'campaign.txt', content: 'My campaign notes' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.context).toBe('My campaign notes')
  })

  // --- CHARACTER BACKSTORIES ---

  it('extracts character backstories from characters/ directory', () => {
    const files: FileEntry[] = [
      { path: 'characters/vex.md', content: 'Vex: Half-elf ranger' },
      { path: 'characters/drogan.md', content: 'Drogan: Dwarf cleric' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.characters).toHaveLength(2)
    expect(result.characters[0]).toEqual({ name: 'vex', content: 'Vex: Half-elf ranger' })
    expect(result.characters[1]).toEqual({ name: 'drogan', content: 'Drogan: Dwarf cleric' })
  })

  it('handles nested path separators (backslash and forward slash)', () => {
    const files: FileEntry[] = [
      { path: 'characters\\gruuk.md', content: 'Gruuk: Half-orc barbarian' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.characters).toHaveLength(1)
    expect(result.characters[0].name).toBe('gruuk')
  })

  // --- NPC FILES ---

  it('extracts NPCs from npcs/ directory', () => {
    const files: FileEntry[] = [
      { path: 'npcs/mayor-hild.md', content: 'Mayor Hild: Female human, quest giver' },
      { path: 'npcs/fendrel.md', content: 'Fendrel: Half-elf cartographer' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.npcs).toHaveLength(2)
    expect(result.npcs[0]).toEqual({ name: 'mayor-hild', content: 'Mayor Hild: Female human, quest giver' })
    expect(result.npcs[1]).toEqual({ name: 'fendrel', content: 'Fendrel: Half-elf cartographer' })
  })

  // --- PLOT HOOKS ---

  it('extracts plot hooks from plot-hooks.md', () => {
    const files: FileEntry[] = [
      { path: 'plot-hooks.md', content: '- Coded letter with spider seal\n- Seedling for Oldroot' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.plotHooks).toBe('- Coded letter with spider seal\n- Seedling for Oldroot')
  })

  // --- ENCOUNTERS ---

  it('extracts encounters from encounters.md', () => {
    const files: FileEntry[] = [
      { path: 'encounters.md', content: 'Skeleton patrol: AC 13, HP 13' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.encounters).toBe('Skeleton patrol: AC 13, HP 13')
  })

  // --- FULL FOLDER ---

  it('parses a complete campaign folder structure', () => {
    const files: FileEntry[] = [
      { path: 'campaign.md', content: 'Curse of the Hollow King' },
      { path: 'characters/vex.md', content: 'Vex backstory' },
      { path: 'characters/drogan.md', content: 'Drogan backstory' },
      { path: 'npcs/mayor-hild.md', content: 'Mayor Hild details' },
      { path: 'plot-hooks.md', content: 'Active hooks' },
      { path: 'encounters.md', content: 'Planned encounters' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.context).toBe('Curse of the Hollow King')
    expect(result.characters).toHaveLength(2)
    expect(result.npcs).toHaveLength(1)
    expect(result.plotHooks).toBe('Active hooks')
    expect(result.encounters).toBe('Planned encounters')
  })

  // --- MISSING FILES ---

  it('returns empty defaults when no matching files found', () => {
    const files: FileEntry[] = [
      { path: 'readme.md', content: 'This is a readme' },
      { path: 'images/map.png', content: '' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.context).toBe('')
    expect(result.characters).toEqual([])
    expect(result.npcs).toEqual([])
    expect(result.plotHooks).toBe('')
    expect(result.encounters).toBe('')
  })

  it('handles empty file list', () => {
    const result = parseCampaignFolder([])

    expect(result.context).toBe('')
    expect(result.characters).toEqual([])
  })

  // --- FLAT STRUCTURE FALLBACK ---

  it('ignores non-.md/.txt files', () => {
    const files: FileEntry[] = [
      { path: 'campaign.md', content: 'Notes' },
      { path: 'characters/portrait.png', content: '' },
      { path: 'characters/vex.md', content: 'Vex backstory' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.characters).toHaveLength(1)
    expect(result.characters[0].name).toBe('vex')
  })

  // --- toContext / toBackstories FORMATTERS ---

  it('toContext combines context, NPCs, plot hooks, and encounters into a single string', () => {
    const files: FileEntry[] = [
      { path: 'campaign.md', content: 'World: Forgotten Realms' },
      { path: 'npcs/mayor-hild.md', content: 'Mayor Hild: quest giver' },
      { path: 'npcs/fendrel.md', content: 'Fendrel: cartographer' },
      { path: 'plot-hooks.md', content: '- Coded letter' },
      { path: 'encounters.md', content: 'Skeletons: AC 13' },
    ]

    const result = parseCampaignFolder(files)
    const contextStr = result.toContext()

    expect(contextStr).toContain('World: Forgotten Realms')
    expect(contextStr).toContain('Mayor Hild: quest giver')
    expect(contextStr).toContain('Fendrel: cartographer')
    expect(contextStr).toContain('- Coded letter')
    expect(contextStr).toContain('Skeletons: AC 13')
  })

  it('toBackstories combines all character files into a single string', () => {
    const files: FileEntry[] = [
      { path: 'characters/vex.md', content: 'Vex: Half-elf ranger' },
      { path: 'characters/drogan.md', content: 'Drogan: Dwarf cleric' },
    ]

    const result = parseCampaignFolder(files)
    const backstoriesStr = result.toBackstories()

    expect(backstoriesStr).toContain('Vex: Half-elf ranger')
    expect(backstoriesStr).toContain('Drogan: Dwarf cleric')
  })

  it('toContext returns just context when no NPCs/hooks/encounters', () => {
    const files: FileEntry[] = [
      { path: 'campaign.md', content: 'Simple campaign' },
    ]

    const result = parseCampaignFolder(files)

    expect(result.toContext()).toBe('Simple campaign')
  })

  it('toBackstories returns empty string when no characters', () => {
    const result = parseCampaignFolder([])

    expect(result.toBackstories()).toBe('')
  })
})
