/**
 * BDD + TDD Tests for CampaignEditor file import
 *
 * Tests file import buttons, file reading, multi-file backstory import,
 * and drag-and-drop support.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampaignEditor } from './CampaignEditor'

// Helper to create a mock File
function createMockFile(name: string, content: string, type = 'text/plain'): File {
  return new File([content], name, { type })
}

describe('CampaignEditor — File Import', () => {
  let user: ReturnType<typeof userEvent.setup>
  const defaultProps = {
    context: '',
    backstories: '',
    onContextChange: vi.fn(),
    onBackstoriesChange: vi.fn(),
    sessionActive: false,
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  // --- IMPORT BUTTONS RENDER ---

  describe('Scenario: Import buttons are visible when session is idle', () => {
    it('Then import buttons appear for both context and backstories', () => {
      render(<CampaignEditor {...defaultProps} />)

      expect(screen.getByRole('button', { name: /import context/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /import backstories/i })).toBeInTheDocument()
    })
  })

  describe('Scenario: Import buttons are hidden during active session', () => {
    it('Then import buttons are not rendered when session is active', () => {
      render(<CampaignEditor {...defaultProps} sessionActive={true} />)

      expect(screen.queryByRole('button', { name: /import context/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /import backstories/i })).not.toBeInTheDocument()
    })
  })

  // --- SINGLE FILE IMPORT (CAMPAIGN CONTEXT) ---

  describe('Scenario: DM imports a campaign context file', () => {
    it('Then the file contents populate the context field', async () => {
      render(<CampaignEditor {...defaultProps} />)

      const fileContent = 'Campaign: Curse of the Hollow King\nNPCs: Mayor Hild'
      const file = createMockFile('campaign.md', fileContent)

      // Find the hidden file input and upload
      const fileInput = screen.getByTestId('context-file-input') as HTMLInputElement
      await user.upload(fileInput, file)

      expect(defaultProps.onContextChange).toHaveBeenCalledWith(fileContent)
    })
  })

  describe('Scenario: DM imports a .md context file', () => {
    it('Then markdown files are accepted', async () => {
      render(<CampaignEditor {...defaultProps} />)

      const file = createMockFile('notes.md', '# Campaign Notes\n\nSome content', 'text/markdown')
      const fileInput = screen.getByTestId('context-file-input') as HTMLInputElement
      await user.upload(fileInput, file)

      expect(defaultProps.onContextChange).toHaveBeenCalledWith('# Campaign Notes\n\nSome content')
    })
  })

  // --- MULTIPLE FILE IMPORT (BACKSTORIES) ---

  describe('Scenario: DM imports multiple backstory files', () => {
    it('Then all files are concatenated with separators', async () => {
      render(<CampaignEditor {...defaultProps} />)

      const file1 = createMockFile('vex.md', 'Vex: Half-elf ranger seeking revenge')
      const file2 = createMockFile('drogan.md', 'Drogan: Dwarf cleric, exiled from clan')

      const fileInput = screen.getByTestId('backstories-file-input') as HTMLInputElement
      await user.upload(fileInput, [file1, file2])

      // Should be called with concatenated content
      expect(defaultProps.onBackstoriesChange).toHaveBeenCalledTimes(1)
      const callArg = defaultProps.onBackstoriesChange.mock.calls[0][0]
      expect(callArg).toContain('Vex: Half-elf ranger')
      expect(callArg).toContain('Drogan: Dwarf cleric')
    })
  })

  describe('Scenario: DM imports a single backstory file', () => {
    it('Then the single file populates the backstories field', async () => {
      render(<CampaignEditor {...defaultProps} />)

      const file = createMockFile('characters.txt', 'All character backstories here')
      const fileInput = screen.getByTestId('backstories-file-input') as HTMLInputElement
      await user.upload(fileInput, file)

      expect(defaultProps.onBackstoriesChange).toHaveBeenCalledWith('All character backstories here')
    })
  })

  // --- IMPORT REPLACES EXISTING CONTENT ---

  describe('Scenario: Importing a file replaces existing content', () => {
    it('Then previous content is replaced, not appended', async () => {
      render(<CampaignEditor {...defaultProps} context="Old content" />)

      const file = createMockFile('new.md', 'New content')
      const fileInput = screen.getByTestId('context-file-input') as HTMLInputElement
      await user.upload(fileInput, file)

      expect(defaultProps.onContextChange).toHaveBeenCalledWith('New content')
    })
  })

  // --- FILE INPUT ACCEPTS CORRECT TYPES ---

  describe('Scenario: File inputs accept text and markdown files', () => {
    it('Then the context file input accepts .txt and .md files', () => {
      render(<CampaignEditor {...defaultProps} />)

      const fileInput = screen.getByTestId('context-file-input') as HTMLInputElement
      expect(fileInput.accept).toContain('.txt')
      expect(fileInput.accept).toContain('.md')
    })

    it('Then the backstories file input accepts .txt and .md and allows multiple', () => {
      render(<CampaignEditor {...defaultProps} />)

      const fileInput = screen.getByTestId('backstories-file-input') as HTMLInputElement
      expect(fileInput.accept).toContain('.txt')
      expect(fileInput.accept).toContain('.md')
      expect(fileInput.multiple).toBe(true)
    })
  })

  // --- FOLDER IMPORT ---

  describe('Scenario: Import Folder button is visible when session is idle', () => {
    it('Then an import folder button appears', () => {
      render(<CampaignEditor {...defaultProps} />)

      expect(screen.getByRole('button', { name: /import folder/i })).toBeInTheDocument()
    })
  })

  describe('Scenario: Import Folder button is hidden during active session', () => {
    it('Then import folder button is not rendered when session is active', () => {
      render(<CampaignEditor {...defaultProps} sessionActive={true} />)

      expect(screen.queryByRole('button', { name: /import folder/i })).not.toBeInTheDocument()
    })
  })

  describe('Scenario: DM imports a campaign folder', () => {
    it('Then campaign.md populates context and characters/ populates backstories', async () => {
      render(<CampaignEditor {...defaultProps} />)

      const campaignFile = createMockFile('campaign.md', 'World: Forgotten Realms')
      const vexFile = createMockFile('vex.md', 'Vex: Half-elf ranger')
      const droganFile = createMockFile('drogan.md', 'Drogan: Dwarf cleric')

      // Simulate webkitRelativePath by adding it to files
      Object.defineProperty(campaignFile, 'webkitRelativePath', { value: 'my-campaign/campaign.md' })
      Object.defineProperty(vexFile, 'webkitRelativePath', { value: 'my-campaign/characters/vex.md' })
      Object.defineProperty(droganFile, 'webkitRelativePath', { value: 'my-campaign/characters/drogan.md' })

      const folderInput = screen.getByTestId('folder-file-input') as HTMLInputElement
      await user.upload(folderInput, [campaignFile, vexFile, droganFile])

      // Context should contain campaign.md content
      expect(defaultProps.onContextChange).toHaveBeenCalled()
      const contextArg = defaultProps.onContextChange.mock.calls[0][0]
      expect(contextArg).toContain('World: Forgotten Realms')

      // Backstories should contain character files
      expect(defaultProps.onBackstoriesChange).toHaveBeenCalled()
      const backstoriesArg = defaultProps.onBackstoriesChange.mock.calls[0][0]
      expect(backstoriesArg).toContain('Vex: Half-elf ranger')
      expect(backstoriesArg).toContain('Drogan: Dwarf cleric')
    })
  })
})
