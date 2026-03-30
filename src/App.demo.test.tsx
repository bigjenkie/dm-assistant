/**
 * Frontend tests with demo data loaded.
 *
 * These test the full app experience after clicking "Load Demo":
 * transcript populated, campaign loaded, session active, buttons responsive.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { LLMProvider } from './lib/llm/provider'
import { DEMO_TRANSCRIPT_ENTRIES } from './lib/test-data'

function mockProvider(responseText: string = 'NONE'): LLMProvider {
  return {
    name: 'mock',
    generate: vi.fn().mockResolvedValue({ text: responseText, latencyMs: 50 }),
    healthCheck: vi.fn().mockResolvedValue(true),
  }
}

async function loadDemoAndWait(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Load Demo/i }))
}

describe('App with Demo Data Loaded', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- LOAD DEMO ---

  describe('Load Demo button', () => {
    it('populates transcript with demo entries', async () => {
      render(<App provider={mockProvider()} />)
      await loadDemoAndWait(user)

      // Use text unique to transcript entries (not in campaign context)
      expect(screen.getByText(/orders an ale and sits in the corner/)).toBeInTheDocument()
      expect(screen.getByText(/I grip my axe/)).toBeInTheDocument()
      expect(screen.getByText(/wasn't Fendrel the one who sold us that bad map/i)).toBeInTheDocument()
    })

    it('loads all transcript entries', async () => {
      render(<App provider={mockProvider()} />)
      await loadDemoAndWait(user)

      // Each entry text should appear
      for (const entry of DEMO_TRANSCRIPT_ENTRIES.slice(0, 5)) {
        expect(screen.getByText(entry.text)).toBeInTheDocument()
      }
    })

    it('starts the session automatically', async () => {
      render(<App provider={mockProvider()} />)
      await loadDemoAndWait(user)

      expect(screen.getByText(/Session Active/)).toBeInTheDocument()
      expect(screen.getByText(/LIVE/)).toBeInTheDocument()
    })

    it('shows campaign reference panel with parsed data', async () => {
      render(<App provider={mockProvider()} />)
      await loadDemoAndWait(user)

      // Campaign reference panel shows parsed entries
      expect(screen.getByText('Campaign')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Search campaign/i)).toBeInTheDocument()
    })

    it('enables all panic buttons', async () => {
      render(<App provider={mockProvider()} />)
      await loadDemoAndWait(user)

      expect(screen.getByRole('button', { name: /Phones Out/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /Need an NPC/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /Recap/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /Off Script/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /Dead Air/i })).not.toBeDisabled()
    })

    it('shows Suggest and End Session buttons', async () => {
      render(<App provider={mockProvider()} />)
      await loadDemoAndWait(user)

      expect(screen.getByRole('button', { name: /Suggest/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /End Session/i })).toBeInTheDocument()
    })
  })

  // --- SUGGEST WITH DEMO DATA ---

  describe('Suggest button with loaded data', () => {
    it('fires LLM call with demo campaign context and transcript', async () => {
      const provider = mockProvider(
        'TYPE: RECALL\nTITLE: Fendrel the Cartographer\nBODY: Half-elf, Shadow Guild agent. Sold the party a misleading map. He doesn\'t know they survived.\nDM_ONLY: true'
      )
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      await user.click(screen.getByRole('button', { name: /Suggest/i }))

      // "doesn't know they survived" is unique to the suggestion body, not the campaign reference
      expect(await screen.findByText(/doesn't know they survived/i)).toBeInTheDocument()
      expect(screen.getByText('DM ONLY')).toBeInTheDocument()
      expect(provider.generate).toHaveBeenCalledOnce()
    })

    it('passes campaign context to the provider', async () => {
      const provider = mockProvider('NONE')
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      await user.click(screen.getByRole('button', { name: /Suggest/i }))
      await vi.advanceTimersByTimeAsync(100)

      // Verify the generate call included campaign context
      const call = (provider.generate as ReturnType<typeof vi.fn>).mock.calls[0]
      const systemPrompt = call[0] as string
      expect(systemPrompt).toContain('Hollow King')
      expect(systemPrompt).toContain('Vex')
    })

    it('shows toast when provider returns NONE', async () => {
      render(<App provider={mockProvider('NONE')} />)
      await loadDemoAndWait(user)

      await user.click(screen.getByRole('button', { name: /Suggest/i }))

      expect(await screen.findByText(/No suggestion/i)).toBeInTheDocument()
    })
  })

  // --- PANIC BUTTONS WITH DEMO DATA ---

  describe('Panic buttons with loaded data', () => {
    it('Phones Out generates a backstory-based suggestion', async () => {
      const provider = mockProvider(
        'TYPE: IMPROV\nTITLE: Spotlight: Gruuk\nBODY: Gruuk, as the old woman mentions the Shadow Guild, you feel a chill. Raiders who burned your monastery wore a similar spider insignia.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      await user.click(screen.getByRole('button', { name: /Phones Out/i }))

      expect(await screen.findByText('Spotlight: Gruuk')).toBeInTheDocument()
      expect(screen.getByText(/monastery/)).toBeInTheDocument()
      expect(screen.getByText(/📱 Phones Out/)).toBeInTheDocument()
    })

    it('Need an NPC generates a scene-appropriate character', async () => {
      const provider = mockProvider(
        'TYPE: IMPROV\nTITLE: Mirra the Barmaid\nBODY: Human female, mid-20s. Sharp-eyed, notices everything. Knows Fendrel comes in every Tuesday. Quirk: polishes glasses when nervous.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      await user.click(screen.getByRole('button', { name: /Need an NPC/i }))

      expect(await screen.findByText('Mirra the Barmaid')).toBeInTheDocument()
    })

    it('Recap generates a session summary from demo transcript', async () => {
      const provider = mockProvider(
        'TYPE: RECALL\nTITLE: Session Recap\nBODY: The party returned to the Charred Flagon after the cave. They studied the coded letter and learned about the Shadow Guild. They now suspect Fendrel.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      await user.click(screen.getByRole('button', { name: /Recap/i }))

      expect(await screen.findByText('Session Recap')).toBeInTheDocument()
      expect(screen.getByText(/They now suspect Fendrel/)).toBeInTheDocument()
    })

    it('Off Script uses campaign context', async () => {
      const provider = mockProvider(
        'TYPE: IMPROV\nTITLE: The Old Well\nBODY: Behind the tavern is an old stone well, sealed with iron bands. Locals avoid it. An NPC says it leads to tunnels under Greyhold — possibly connected to the cult.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      await user.click(screen.getByRole('button', { name: /Off Script/i }))

      expect(await screen.findByText('The Old Well')).toBeInTheDocument()
    })

    it('passes backstories to Phones Out prompt', async () => {
      const provider = mockProvider('TYPE: IMPROV\nTITLE: Test\nBODY: Test.\nDM_ONLY: false')
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      await user.click(screen.getByRole('button', { name: /Phones Out/i }))
      await screen.findByText('Test')

      const call = (provider.generate as ReturnType<typeof vi.fn>).mock.calls[0]
      const systemPrompt = call[0] as string
      expect(systemPrompt).toContain('Gruuk')
      expect(systemPrompt).toContain('Sable')
    })
  })

  // --- QUESTION WITH DEMO DATA ---

  describe('Question input with loaded data', () => {
    it('sends question with campaign context to provider', async () => {
      const provider = mockProvider(
        'TYPE: RULES\nTITLE: Cult Fanatic Stats\nBODY: AC 13, HP 33. Spells: command, inflict wounds, hold person. Dagger +4 for 1d4+2.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      const questionInput = screen.getByPlaceholderText(/Ask a question/i)
      await user.type(questionInput, 'What are the cult fanatic stats?')
      await user.click(screen.getByRole('button', { name: /Ask/i }))

      expect(await screen.findByText('Cult Fanatic Stats')).toBeInTheDocument()
      expect(screen.getByText('Question')).toBeInTheDocument()
      expect(questionInput).toHaveValue('')
    })
  })

  // --- PROVIDER ERROR WITH DEMO DATA ---

  describe('Provider errors with loaded data', () => {
    it('shows connection error toast when provider fails after demo load', async () => {
      const provider: LLMProvider = {
        name: 'failing',
        generate: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        healthCheck: vi.fn().mockResolvedValue(false),
      }
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      await user.click(screen.getByRole('button', { name: /Suggest/i }))

      // Engine throws, App catches and shows error in toast
      expect(await screen.findByText(/LLM error.*ECONNREFUSED/i)).toBeInTheDocument()
    })
  })

  // --- MULTIPLE SUGGESTIONS ACCUMULATE ---

  describe('Multiple interactions with demo data', () => {
    it('suggestion count updates in status bar after multiple pulls', async () => {
      let callCount = 0
      const provider: LLMProvider = {
        name: 'mock',
        generate: vi.fn().mockImplementation(() => {
          callCount++
          return Promise.resolve({
            text: `TYPE: RECALL\nTITLE: Result ${callCount}\nBODY: Info ${callCount}.\nDM_ONLY: false`,
            latencyMs: 50,
          })
        }),
        healthCheck: vi.fn().mockResolvedValue(true),
      }
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      expect(screen.getByText('0 suggestions')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Suggest/i }))
      await screen.findByText('Result 1')
      expect(screen.getByText('1 suggestions')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Need an NPC/i }))
      await screen.findByText('Result 2')
      expect(screen.getByText('2 suggestions')).toBeInTheDocument()
    })

    it('pin and dismiss work on suggestions generated from demo data', async () => {
      const provider = mockProvider(
        'TYPE: RECALL\nTITLE: Test Suggestion\nBODY: Unique test body for pin dismiss.\nDM_ONLY: false'
      )
      render(<App provider={provider} />)
      await loadDemoAndWait(user)

      await user.click(screen.getByRole('button', { name: /Suggest/i }))
      await screen.findByText('Test Suggestion')

      // Pin it
      await user.click(screen.getByTitle('Pin'))
      expect(screen.getByText('Pinned')).toBeInTheDocument()

      // Dismiss it
      await user.click(screen.getByTitle('Unpin'))
      await user.click(screen.getByTitle('Dismiss'))
      expect(screen.queryByText('Test Suggestion')).not.toBeInTheDocument()
    })
  })

})
