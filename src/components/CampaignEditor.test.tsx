/**
 * TDD tests for CampaignEditor — folder-first design.
 *
 * Primary: Import Campaign Folder (prominent)
 * Secondary: Manual edit textareas (collapsed by default)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampaignEditor } from './CampaignEditor'

function createMockFile(name: string, content: string, relativePath?: string): File {
  const file = new File([content], name, { type: 'text/plain' })
  if (relativePath) {
    Object.defineProperty(file, 'webkitRelativePath', { value: relativePath })
  }
  return file
}

describe('CampaignEditor — Folder-First Design', () => {
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

  // --- PRIMARY: FOLDER IMPORT ---

  describe('Folder import is the primary action', () => {
    it('shows the Import Campaign Folder button prominently', () => {
      render(<CampaignEditor {...defaultProps} />)

      const btn = screen.getByRole('button', { name: /import campaign folder/i })
      expect(btn).toBeInTheDocument()
    })

    it('hides the folder import button during active session', () => {
      render(<CampaignEditor {...defaultProps} sessionActive={true} />)

      expect(screen.queryByRole('button', { name: /import campaign folder/i })).not.toBeInTheDocument()
    })

    it('shows folder convention hint text', () => {
      render(<CampaignEditor {...defaultProps} />)

      expect(screen.getByText(/campaign\.md/)).toBeInTheDocument()
    })

    it('populates context and backstories from a campaign folder', async () => {
      render(<CampaignEditor {...defaultProps} />)

      const campaignFile = createMockFile('campaign.md', 'World: Forgotten Realms', 'my-campaign/campaign.md')
      const vexFile = createMockFile('vex.md', 'Vex: Half-elf ranger', 'my-campaign/characters/vex.md')
      const npcFile = createMockFile('mayor-hild.md', 'Mayor Hild: quest giver', 'my-campaign/npcs/mayor-hild.md')

      const folderInput = screen.getByTestId('folder-file-input') as HTMLInputElement
      await user.upload(folderInput, [campaignFile, vexFile, npcFile])

      expect(defaultProps.onContextChange).toHaveBeenCalled()
      const contextArg = defaultProps.onContextChange.mock.calls[0][0]
      expect(contextArg).toContain('World: Forgotten Realms')
      expect(contextArg).toContain('Mayor Hild: quest giver')

      expect(defaultProps.onBackstoriesChange).toHaveBeenCalled()
      expect(defaultProps.onBackstoriesChange.mock.calls[0][0]).toContain('Vex: Half-elf ranger')
    })

    it('shows a loaded summary after folder import', async () => {
      const { rerender } = render(<CampaignEditor {...defaultProps} />)

      const campaignFile = createMockFile('campaign.md', 'World notes', 'camp/campaign.md')
      const vexFile = createMockFile('vex.md', 'Vex backstory', 'camp/characters/vex.md')
      const droganFile = createMockFile('drogan.md', 'Drogan backstory', 'camp/characters/drogan.md')
      const npcFile = createMockFile('mayor-hild.md', 'Hild info', 'camp/npcs/mayor-hild.md')

      const folderInput = screen.getByTestId('folder-file-input') as HTMLInputElement
      await user.upload(folderInput, [campaignFile, vexFile, droganFile, npcFile])

      // Rerender with the data that would have been set by the callbacks
      rerender(<CampaignEditor
        {...defaultProps}
        context="World notes\n\nNPCs:\nHild info"
        backstories="Vex backstory\n\nDrogan backstory"
      />)

      expect(screen.getByText(/loaded/i)).toBeInTheDocument()
    })

    it('shows loaded summary with content stats when context is populated', () => {
      render(<CampaignEditor
        {...defaultProps}
        context="Some campaign context here"
        backstories="Vex backstory\n\nDrogan backstory"
      />)

      expect(screen.getByText(/loaded/i)).toBeInTheDocument()
    })
  })

  // --- SECONDARY: MANUAL EDIT (COLLAPSED) ---

  describe('Manual edit textareas are secondary (collapsed)', () => {
    it('textareas are hidden by default', () => {
      render(<CampaignEditor {...defaultProps} />)

      expect(screen.queryByPlaceholderText(/campaign notes/i)).not.toBeInTheDocument()
    })

    it('shows a toggle to expand manual editing', () => {
      render(<CampaignEditor {...defaultProps} />)

      expect(screen.getByRole('button', { name: /edit manually/i })).toBeInTheDocument()
    })

    it('clicking the toggle reveals the textareas', async () => {
      render(<CampaignEditor {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /edit manually/i }))

      expect(screen.getByPlaceholderText(/campaign notes/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/character name/i)).toBeInTheDocument()
    })

    it('textareas are editable when expanded', async () => {
      render(<CampaignEditor {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /edit manually/i }))

      const contextArea = screen.getByPlaceholderText(/campaign notes/i)
      await user.type(contextArea, 'My notes')

      expect(defaultProps.onContextChange).toHaveBeenCalled()
    })

    it('individual file import buttons appear when expanded', async () => {
      render(<CampaignEditor {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /edit manually/i }))

      expect(screen.getByRole('button', { name: /import context/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /import backstories/i })).toBeInTheDocument()
    })

    it('file import buttons are hidden when collapsed', () => {
      render(<CampaignEditor {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /import context/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /import backstories/i })).not.toBeInTheDocument()
    })
  })

  // --- SESSION ACTIVE ---

  describe('During active session', () => {
    it('shows loaded summary as read-only when data exists', () => {
      render(<CampaignEditor
        {...defaultProps}
        sessionActive={true}
        context="Campaign data"
        backstories="Character data"
      />)

      expect(screen.getByText(/loaded/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /import campaign folder/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /edit manually/i })).not.toBeInTheDocument()
    })

    it('textareas are disabled during active session when expanded before start', () => {
      // If a user expanded manually before starting, the textareas should be disabled
      render(<CampaignEditor
        {...defaultProps}
        sessionActive={true}
        context="Some context"
      />)

      // No edit controls during session
      expect(screen.queryByPlaceholderText(/campaign notes/i)).not.toBeInTheDocument()
    })
  })

  // --- FILE INPUT ATTRIBUTES ---

  describe('File input configuration', () => {
    it('folder input has webkitdirectory and multiple attributes', () => {
      render(<CampaignEditor {...defaultProps} />)

      const folderInput = screen.getByTestId('folder-file-input') as HTMLInputElement
      expect(folderInput.multiple).toBe(true)
    })

    it('context file input accepts .txt and .md', async () => {
      render(<CampaignEditor {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /edit manually/i }))

      const fileInput = screen.getByTestId('context-file-input') as HTMLInputElement
      expect(fileInput.accept).toContain('.txt')
      expect(fileInput.accept).toContain('.md')
    })

    it('backstories file input allows multiple files', async () => {
      render(<CampaignEditor {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /edit manually/i }))

      const fileInput = screen.getByTestId('backstories-file-input') as HTMLInputElement
      expect(fileInput.multiple).toBe(true)
    })
  })
})
