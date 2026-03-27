import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusBar } from './StatusBar'

describe('StatusBar — Provider Switcher', () => {
  let user: ReturnType<typeof userEvent.setup>

  const defaultProps = {
    sessionState: 'idle' as const,
    providerName: 'ollama',
    providerStatus: 'connected' as const,
    sessionElapsed: 0,
    suggestionCount: 0,
    onProviderSwitch: vi.fn(),
    onConfigureAnthropic: vi.fn(),
    anthropicKeyConfigured: false,
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('provider indicator is clickable', () => {
    render(<StatusBar {...defaultProps} />)

    const indicator = screen.getByRole('button', { name: /ollama/i })
    expect(indicator).toBeInTheDocument()
  })

  it('clicking provider opens a switcher with options', async () => {
    render(<StatusBar {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /ollama/i }))

    expect(screen.getByText(/Local \(Ollama\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Claude \(Anthropic\)/i)).toBeInTheDocument()
  })

  it('selecting Anthropic calls onProviderSwitch with "anthropic"', async () => {
    render(<StatusBar {...defaultProps} anthropicKeyConfigured={true} />)

    await user.click(screen.getByRole('button', { name: /ollama/i }))
    await user.click(screen.getByText(/Claude \(Anthropic\)/i))

    expect(defaultProps.onProviderSwitch).toHaveBeenCalledWith('anthropic')
  })

  it('selecting Ollama calls onProviderSwitch with "ollama"', async () => {
    render(<StatusBar {...defaultProps} providerName="anthropic" />)

    await user.click(screen.getByRole('button', { name: /anthropic/i }))
    await user.click(screen.getByText(/Local \(Ollama\)/i))

    expect(defaultProps.onProviderSwitch).toHaveBeenCalledWith('ollama')
  })

  it('current provider is visually marked in the switcher', async () => {
    render(<StatusBar {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /ollama/i }))

    const ollamaOption = screen.getByText(/Local \(Ollama\)/i)
    expect(ollamaOption.closest('[data-active="true"]')).toBeInTheDocument()
  })

  it('Anthropic option shows "Set up" when key not configured', async () => {
    render(<StatusBar {...defaultProps} anthropicKeyConfigured={false} />)

    await user.click(screen.getByRole('button', { name: /ollama/i }))

    expect(screen.getByText(/Set up/i)).toBeInTheDocument()
  })

  it('clicking Anthropic without key calls onConfigureAnthropic instead of switching', async () => {
    render(<StatusBar {...defaultProps} anthropicKeyConfigured={false} />)

    await user.click(screen.getByRole('button', { name: /ollama/i }))
    await user.click(screen.getByText(/Claude \(Anthropic\)/i))

    expect(defaultProps.onConfigureAnthropic).toHaveBeenCalled()
    expect(defaultProps.onProviderSwitch).not.toHaveBeenCalled()
  })

  it('clicking outside the switcher closes it', async () => {
    render(<StatusBar {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /ollama/i }))
    expect(screen.getByText(/Local \(Ollama\)/i)).toBeInTheDocument()

    // Click elsewhere
    await user.click(document.body)

    expect(screen.queryByText(/Local \(Ollama\)/i)).not.toBeInTheDocument()
  })

  it('switcher closes after selection', async () => {
    render(<StatusBar {...defaultProps} anthropicKeyConfigured={true} />)

    await user.click(screen.getByRole('button', { name: /ollama/i }))
    await user.click(screen.getByText(/Claude \(Anthropic\)/i))

    expect(screen.queryByText(/Local \(Ollama\)/i)).not.toBeInTheDocument()
  })
})
