/**
 * BDD Component Tests for App.tsx
 *
 * Maps to features/app-session.feature Gherkin scenarios.
 * Uses @testing-library/react to verify user-visible behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { LLMProvider } from './lib/llm/provider'

// --- Mock Provider Factory ---

function mockProvider(responseText: string = 'NONE'): LLMProvider {
  return {
    name: 'mock',
    generate: vi.fn().mockResolvedValue({ text: responseText, latencyMs: 50 }),
    healthCheck: vi.fn().mockResolvedValue(true),
  }
}

// --- BDD Scenarios ---

describe('Feature: DM Session Workflow', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- SESSION LIFECYCLE ---

  describe('Scenario: App starts in idle state', () => {
    it('Then the status bar shows "No Session", folder import visible, panic buttons disabled', () => {
      // Given
      render(<App provider={mockProvider()} />)

      // Then
      expect(screen.getByText(/No Session/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Import Campaign Folder/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Phones Out/i })).toBeDisabled()
    })
  })

  describe('Scenario: DM starts a session', () => {
    it('Then status shows active, folder import hidden, panic buttons enabled', async () => {
      // Given
      render(<App provider={mockProvider()} />)

      // When
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      // Then
      expect(screen.getByText(/Session Active/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Import Campaign Folder/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Phones Out/i })).not.toBeDisabled()
    })
  })

  describe('Scenario: DM ends a session', () => {
    it('Then status shows ended, panic buttons disabled, editor remains locked', async () => {
      // Given — start session
      render(<App provider={mockProvider()} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      // When
      await user.click(screen.getByRole('button', { name: /End Session/i }))

      // Then
      expect(screen.getByText(/Session Ended/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Phones Out/i })).toBeDisabled()
      expect(screen.queryByRole('button', { name: /Import Campaign Folder/i })).not.toBeInTheDocument()
    })
  })

  // --- CAMPAIGN CONTEXT ---

  describe('Scenario: Campaign editor is locked during active session', () => {
    it('Then folder import and manual edit are hidden, lock message shown', async () => {
      render(<App provider={mockProvider()} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      expect(screen.queryByRole('button', { name: /Import Campaign Folder/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /edit manually/i })).not.toBeInTheDocument()
    })
  })

  // --- TRANSCRIPT INPUT ---

  describe('Scenario: DM adds a transcript entry during session', () => {
    it('Then the entry appears with a timestamp and the input clears', async () => {
      render(<App provider={mockProvider()} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      // When
      const input = screen.getByPlaceholderText(/what's being said/i)
      await user.type(input, 'The party enters the tavern')
      await user.click(screen.getByRole('button', { name: /^Add$/i }))

      // Then
      expect(screen.getByText('The party enters the tavern')).toBeInTheDocument()
      expect(input).toHaveValue('')
    })
  })

  describe('Scenario: Multiple transcript entries accumulate', () => {
    it('Then both entries appear in order', async () => {
      render(<App provider={mockProvider()} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      const input = screen.getByPlaceholderText(/what's being said/i)

      await user.type(input, 'Player asks about the map')
      await user.click(screen.getByRole('button', { name: /^Add$/i }))

      await user.type(input, 'DM describes the merchant')
      await user.click(screen.getByRole('button', { name: /^Add$/i }))

      // Then
      expect(screen.getByText('Player asks about the map')).toBeInTheDocument()
      expect(screen.getByText('DM describes the merchant')).toBeInTheDocument()
    })
  })

  // --- PULL SUGGESTIONS ---

  describe('Scenario: DM clicks Suggest and receives a suggestion card', () => {
    it('Then a suggestion card appears with type icon, title, and body', async () => {
      const provider = mockProvider(
        'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver, 500gp reward for the Ashen Crown.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      // Add transcript context
      const input = screen.getByPlaceholderText(/what's being said/i)
      await user.type(input, 'Let us go talk to the mayor')
      await user.click(screen.getByRole('button', { name: /^Add$/i }))

      // When
      await user.click(screen.getByRole('button', { name: /Suggest/i }))

      // Then
      expect(await screen.findByText('Mayor Hild')).toBeInTheDocument()
      expect(screen.getByText(/500gp/)).toBeInTheDocument()
    })
  })

  describe('Scenario: DM clicks Suggest with irrelevant transcript (NONE)', () => {
    it('Then no new suggestion card appears', async () => {
      const provider = mockProvider('NONE')
      render(<App provider={provider} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      const input = screen.getByPlaceholderText(/what's being said/i)
      await user.type(input, 'Pass the chips')
      await user.click(screen.getByRole('button', { name: /^Add$/i }))

      // When
      await user.click(screen.getByRole('button', { name: /Suggest/i }))

      // Allow async to settle
      await vi.advanceTimersByTimeAsync(200)

      // Then — no suggestion cards, just the empty message
      expect(screen.queryByText(/DM ONLY/)).not.toBeInTheDocument()
      expect(screen.getByText(/Suggestions will appear/i)).toBeInTheDocument()
    })
  })

  // --- PANIC BUTTONS ---

  describe('Scenario: DM clicks Phones Out panic button', () => {
    it('Then a suggestion card appears with source "Panic"', async () => {
      const provider = mockProvider(
        'TYPE: IMPROV\nTITLE: Spotlight: Gruuk\nBODY: Gruuk notices something familiar about the chapel.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)

      // Expand manual edit and add required backstories + transcript
      await user.click(screen.getByRole('button', { name: /edit manually/i }))
      await user.type(screen.getByPlaceholderText(/character name/i), 'Gruuk: Half-orc barbarian')
      await user.click(screen.getByRole('button', { name: /Start Session/i }))
      const input = screen.getByPlaceholderText(/what's being said/i)
      await user.type(input, 'The party explores the ruins')
      await user.click(screen.getByRole('button', { name: /^Add$/i }))

      // When
      await user.click(screen.getByRole('button', { name: /Phones Out/i }))

      // Then
      expect(await screen.findByText('Spotlight: Gruuk')).toBeInTheDocument()
      expect(screen.getByText('Panic')).toBeInTheDocument()
    })
  })

  describe('Scenario: DM clicks Need an NPC panic button', () => {
    it('Then a suggestion card appears with an NPC', async () => {
      const provider = mockProvider(
        'TYPE: IMPROV\nTITLE: Grel the Dockhand\nBODY: Half-orc, gruff but fair. Always chewing a fish bone.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)

      // Add required campaign context
      await user.click(screen.getByRole('button', { name: /edit manually/i }))
      await user.type(screen.getByPlaceholderText(/campaign notes/i), 'Fantasy port town')
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      await user.click(screen.getByRole('button', { name: /Need an NPC/i }))

      expect(await screen.findByText('Grel the Dockhand')).toBeInTheDocument()
    })
  })

  describe('Scenario: DM clicks Recap panic button', () => {
    it('Then a suggestion card appears with a summary', async () => {
      const provider = mockProvider(
        'TYPE: RECALL\nTITLE: Session Recap\nBODY: The party explored the cave and found the coded letter.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      // Add required transcript
      const input = screen.getByPlaceholderText(/what's being said/i)
      await user.type(input, 'The party explored the cave')
      await user.click(screen.getByRole('button', { name: /^Add$/i }))

      await user.click(screen.getByRole('button', { name: /Recap/i }))

      expect(await screen.findByText('Session Recap')).toBeInTheDocument()
    })
  })

  // --- PANIC BUTTON VALIDATION ---

  describe('Scenario: DM clicks Phones Out with no backstories loaded', () => {
    it('Then a toast warning appears instead of firing the LLM', async () => {
      const provider = mockProvider('NONE')
      render(<App provider={provider} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      // No backstories loaded, no transcript — click Phones Out
      await user.click(screen.getByRole('button', { name: /Phones Out/i }))

      // Then — toast appears, LLM not called
      expect(await screen.findByText(/backstor/i)).toBeInTheDocument()
      expect(provider.generate).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: DM clicks Recap with no transcript', () => {
    it('Then a toast warning about missing transcript appears', async () => {
      const provider = mockProvider('NONE')
      render(<App provider={provider} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      await user.click(screen.getByRole('button', { name: /Recap/i }))

      expect(await screen.findByText(/Add some transcript first/i)).toBeInTheDocument()
      expect(provider.generate).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: Toast auto-dismisses after a few seconds', () => {
    it('Then the toast disappears after 4 seconds', async () => {
      const provider = mockProvider('NONE')
      render(<App provider={provider} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      await user.click(screen.getByRole('button', { name: /Recap/i }))
      expect(await screen.findByText(/Add some transcript first/i)).toBeInTheDocument()

      // Advance time past toast duration
      await vi.advanceTimersByTimeAsync(4500)

      expect(screen.queryByText(/Add some transcript first/i)).not.toBeInTheDocument()
    })
  })

  // --- AD-HOC QUESTIONS ---

  describe('Scenario: DM asks a rules question', () => {
    it('Then a suggestion card appears with source "Q&A" and the input clears', async () => {
      const provider = mockProvider(
        'TYPE: RULES\nTITLE: Grapple Rules\nBODY: Replaces one attack, contested check.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      // When
      const questionInput = screen.getByPlaceholderText(/Ask a question/i)
      await user.type(questionInput, 'How does grappling work?')
      await user.click(screen.getByRole('button', { name: /Ask/i }))

      // Then
      expect(await screen.findByText('Grapple Rules')).toBeInTheDocument()
      expect(screen.getByText('Q&A')).toBeInTheDocument()
      expect(questionInput).toHaveValue('')
    })
  })

  // --- SUGGESTION MANAGEMENT ---

  describe('Scenario: DM pins a suggestion', () => {
    it('Then the suggestion appears in the pinned section', async () => {
      const provider = mockProvider(
        'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))
      await user.click(screen.getByRole('button', { name: /Suggest/i }))

      // Wait for card
      await screen.findByText('Mayor Hild')

      // When — click pin
      await user.click(screen.getByTitle('Pin'))

      // Then
      expect(screen.getByText('Pinned')).toBeInTheDocument()
    })
  })

  describe('Scenario: DM dismisses a suggestion', () => {
    it('Then the suggestion is removed from the panel', async () => {
      const provider = mockProvider(
        'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Quest giver.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))
      await user.click(screen.getByRole('button', { name: /Suggest/i }))

      await screen.findByText('Mayor Hild')

      // When
      await user.click(screen.getByTitle('Dismiss'))

      // Then
      expect(screen.queryByText('Mayor Hild')).not.toBeInTheDocument()
    })
  })

  // --- STATUS BAR ---

  describe('Scenario: Status bar shows provider info', () => {
    it('Then provider name and status are displayed', () => {
      render(<App provider={mockProvider()} />)

      expect(screen.getByText(/mock/i)).toBeInTheDocument()
    })
  })

  describe('Scenario: Status bar shows suggestion count', () => {
    it('Then count updates as suggestions are generated', async () => {
      const provider = mockProvider(
        'TYPE: RECALL\nTITLE: Test\nBODY: Info.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await user.click(screen.getByRole('button', { name: /Start Session/i }))

      expect(screen.getByText('0 suggestions')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Suggest/i }))
      await screen.findByText('Test')

      expect(screen.getByText('1 suggestions')).toBeInTheDocument()
    })
  })
})
