import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SuggestionDetail } from './SuggestionDetail'
import type { Suggestion } from '../lib/types'

const baseSuggestion: Suggestion = {
  id: 'sug_1',
  type: 'RECALL',
  title: 'Mayor Hild',
  body: 'Female human, mid-50s. Quest giver who offered 500gp for the Ashen Crown.',
  dmOnly: true,
  timestamp: 600,
  pinned: false,
  dismissed: false,
  source: 'suggest',
  rawResponse: 'TYPE: RECALL\nTITLE: Mayor Hild\nBODY: Female human, mid-50s. Quest giver who offered 500gp for the Ashen Crown.\nDM_ONLY: true',
  triggerTranscript: '[00:42:15] Let us go talk to the mayor about the reward.',
}

describe('SuggestionDetail', () => {
  let user: ReturnType<typeof userEvent.setup>
  const onClose = vi.fn()
  const onFollowUp = vi.fn()

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('displays the suggestion title and full body', () => {
    render(<SuggestionDetail suggestion={baseSuggestion} onClose={onClose} onFollowUp={onFollowUp} />)

    expect(screen.getByText('Mayor Hild')).toBeInTheDocument()
    // Body text appears in both the body section and raw response
    expect(screen.getAllByText(/Female human, mid-50s/).length).toBeGreaterThanOrEqual(1)
  })

  it('displays the type badge and DM ONLY label', () => {
    render(<SuggestionDetail suggestion={baseSuggestion} onClose={onClose} onFollowUp={onFollowUp} />)

    expect(screen.getByText('RECALL')).toBeInTheDocument()
    expect(screen.getByText('DM ONLY')).toBeInTheDocument()
  })

  it('shows a compact trigger context', () => {
    render(<SuggestionDetail suggestion={baseSuggestion} onClose={onClose} onFollowUp={onFollowUp} />)

    expect(screen.getByText(/Triggered by/)).toBeInTheDocument()
    expect(screen.getByText(/go talk to the mayor/)).toBeInTheDocument()
  })

  it('shows the raw LLM response after toggling', async () => {
    render(<SuggestionDetail suggestion={baseSuggestion} onClose={onClose} onFollowUp={onFollowUp} />)

    // Raw response hidden by default
    expect(screen.queryByText(/TYPE: RECALL/)).not.toBeInTheDocument()

    // Toggle open
    await user.click(screen.getByText(/Show raw response/i))
    expect(screen.getByText(/TYPE: RECALL/)).toBeInTheDocument()
  })

  it('shows follow-up action buttons', () => {
    render(<SuggestionDetail suggestion={baseSuggestion} onClose={onClose} onFollowUp={onFollowUp} />)

    expect(screen.getByRole('button', { name: /tell me more/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /what happens next/i })).toBeInTheDocument()
  })

  it('clicking a follow-up button calls onFollowUp with the question', async () => {
    render(<SuggestionDetail suggestion={baseSuggestion} onClose={onClose} onFollowUp={onFollowUp} />)

    await user.click(screen.getByRole('button', { name: /tell me more/i }))

    expect(onFollowUp).toHaveBeenCalledWith(
      expect.stringContaining('Mayor Hild')
    )
  })

  it('has a close button that calls onClose', async () => {
    render(<SuggestionDetail suggestion={baseSuggestion} onClose={onClose} onFollowUp={onFollowUp} />)

    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(onClose).toHaveBeenCalled()
  })

  it('handles suggestion without rawResponse gracefully', () => {
    const minimal = { ...baseSuggestion, rawResponse: undefined, triggerTranscript: undefined }
    render(<SuggestionDetail suggestion={minimal} onClose={onClose} onFollowUp={onFollowUp} />)

    expect(screen.getByText('Mayor Hild')).toBeInTheDocument()
    // No crash, just doesn't show raw/transcript sections
  })
})
