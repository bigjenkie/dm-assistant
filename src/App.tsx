import { useState, useRef, useCallback, useEffect } from 'react'
import type { LLMProvider } from './lib/llm/provider'
import type { Suggestion, TranscriptEntry, PanicButtonId, SessionState, ProviderStatus, ProviderType } from './lib/types'
import { SuggestionEngine } from './lib/suggestion/engine'
import { validatePanicButton } from './lib/suggestion/panic-validation'
import { CampaignEditor } from './components/CampaignEditor'
import { CampaignReference } from './components/CampaignReference'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SuggestionPanel } from './components/SuggestionPanel'
import { PanicToolbar } from './components/PanicToolbar'
import { QuestionInput } from './components/QuestionInput'
import { StatusBar } from './components/StatusBar'
import { ApiKeySetup } from './components/ApiKeySetup'
import { createAnthropicProvider } from './lib/llm/anthropic'
import { DEMO_CONTEXT, DEMO_BACKSTORIES, DEMO_TRANSCRIPT_ENTRIES } from './lib/test-data'

type Props = {
  provider: LLMProvider
  anthropicProvider?: LLMProvider
}

function App({ provider, anthropicProvider }: Props) {
  // --- State ---
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [campaignContext, setCampaignContext] = useState('')
  const [backstories, setBackstories] = useState('')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [panicLoading, setPanicLoading] = useState<PanicButtonId | null>(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [questionLoading, setQuestionLoading] = useState(false)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [providerStatus] = useState<ProviderStatus>('connected')
  const [activeProviderName, setActiveProviderName] = useState(anthropicProvider ? anthropicProvider.name : provider.name)
  const [toast, setToast] = useState<string | null>(null)
  const [showApiKeySetup, setShowApiKeySetup] = useState(false)
  const [anthropicConfigured, setAnthropicConfigured] = useState(!!anthropicProvider)
  const anthropicRef = useRef<LLMProvider | undefined>(anthropicProvider)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const engineRef = useRef(new SuggestionEngine(anthropicProvider ?? provider))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef<number>(0)

  // --- Session Lifecycle ---

  const startSession = useCallback(() => {
    setSessionState('active')
    sessionStartRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000))
    }, 1000)
  }, [])

  const endSession = useCallback(() => {
    setSessionState('ended')
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // --- Helpers ---

  function getRecentTranscript(): string {
    return transcript.map((e) => `[${formatTs(e.ts)}] ${e.text}`).join('\n')
  }

  function getFullTranscript(): string {
    return getRecentTranscript()
  }

  function getCurrentElapsed(): number {
    if (sessionStartRef.current === 0) return 0
    return Math.floor((Date.now() - sessionStartRef.current) / 1000)
  }

  function formatTs(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // --- Transcript ---

  const addTranscriptEntry = useCallback((text: string) => {
    const elapsed = getCurrentElapsed()
    const entry: TranscriptEntry = {
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ts: elapsed,
      text,
      confidence: 1.0,
    }
    setTranscript((prev) => [...prev, entry])
  }, [])

  // --- Provider Switching ---

  const handleProviderSwitch = useCallback((providerType: ProviderType) => {
    if (providerType === 'anthropic' && anthropicRef.current) {
      engineRef.current.setProvider(anthropicRef.current)
      setActiveProviderName(anthropicRef.current.name)
    } else {
      engineRef.current.setProvider(provider)
      setActiveProviderName(provider.name)
    }
  }, [provider])

  const loadDemo = useCallback(() => {
    setCampaignContext(DEMO_CONTEXT)
    setBackstories(DEMO_BACKSTORIES)

    // Load transcript entries with realistic timestamps
    const entries: TranscriptEntry[] = DEMO_TRANSCRIPT_ENTRIES.map((e, i) => ({
      id: `demo_${i}`,
      ts: e.delay,
      text: e.text,
      confidence: 1.0,
    }))
    setTranscript(entries)

    // Auto-start the session
    setSessionState('active')
    sessionStartRef.current = Date.now() - 75_000 // pretend session started 75s ago
    setSessionElapsed(75)
    timerRef.current = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000))
    }, 1000)

    // If no Anthropic provider configured, prompt for API key
    if (!anthropicRef.current) {
      setShowApiKeySetup(true)
    }
  }, [])

  const handleConfigureAnthropic = useCallback(() => {
    setShowApiKeySetup(true)
  }, [])

  const handleApiKeySave = useCallback((apiKey: string) => {
    const newProvider = createAnthropicProvider({
      apiKey,
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
    })
    anthropicRef.current = newProvider
    setAnthropicConfigured(true)
    engineRef.current.setProvider(newProvider)
    setActiveProviderName(newProvider.name)
    setShowApiKeySetup(false)
  }, [])

  // --- Toast ---

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  // --- Suggest (Pull) ---

  const handleSuggest = useCallback(async () => {
    setSuggestLoading(true)
    console.log('[DM] handleSuggest called')
    console.log('[DM] context length:', campaignContext.length, 'backstories:', backstories.length, 'transcript:', transcript.length)
    try {
      const ctx = {
        campaignContext,
        characterBackstories: backstories,
        recentTranscript: getRecentTranscript(),
        fullTranscript: getFullTranscript(),
        sessionElapsed: getCurrentElapsed(),
      }
      console.log('[DM] recentTranscript length:', ctx.recentTranscript.length)
      const suggestion = await engineRef.current.runSuggest(ctx)
      console.log('[DM] suggestion result:', suggestion)
      if (suggestion) {
        setSuggestions((prev) => [...prev, suggestion])
      } else {
        showToast('No suggestion for the current context — try adding more transcript.')
      }
    } catch (err) {
      console.error('[DM] suggest error:', err)
      showToast(`LLM error: ${err instanceof Error ? err.message : 'Check your connection.'}`)
    } finally {
      setSuggestLoading(false)
    }
  }, [campaignContext, backstories, transcript, showToast])

  // --- Panic Buttons ---

  const handlePanic = useCallback(async (buttonId: PanicButtonId) => {
    const ctx = {
      campaignContext,
      characterBackstories: backstories,
      recentTranscript: getRecentTranscript(),
      fullTranscript: getFullTranscript(),
    }

    const warning = validatePanicButton(buttonId, ctx)
    if (warning) {
      showToast(warning)
      return
    }

    setPanicLoading(buttonId)
    try {
      const suggestion = await engineRef.current.runPanic(buttonId, ctx)
      if (suggestion) {
        setSuggestions((prev) => [...prev, suggestion])
      } else {
        showToast('No suggestion generated — try a different button or add more context.')
      }
    } catch (err) {
      showToast(`LLM error: ${err instanceof Error ? err.message : 'Check your connection.'}`)
    } finally {
      setPanicLoading(null)
    }
  }, [campaignContext, backstories, transcript, showToast])

  // --- Questions ---

  const handleQuestion = useCallback(async (question: string) => {
    setQuestionLoading(true)
    try {
      const suggestion = await engineRef.current.runQuestion(question, {
        campaignContext,
        characterBackstories: backstories,
        recentTranscript: getRecentTranscript(),
        fullTranscript: getFullTranscript(),
      })
      if (suggestion) {
        setSuggestions((prev) => [...prev, suggestion])
      } else {
        showToast('No answer generated — try rephrasing your question.')
      }
    } catch (err) {
      showToast(`LLM error: ${err instanceof Error ? err.message : 'Check your connection.'}`)
    } finally {
      setQuestionLoading(false)
    }
  }, [campaignContext, backstories, transcript, showToast])

  // --- Suggestion Management ---

  const handlePin = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    )
  }, [])

  const handleDismiss = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s))
    )
  }, [])

  // --- Follow-Up from Suggestion Card ---

  const handleFollowUp = useCallback(async (question: string) => {
    setQuestionLoading(true)
    try {
      const suggestion = await engineRef.current.runQuestion(question, {
        campaignContext,
        characterBackstories: backstories,
        recentTranscript: getRecentTranscript(),
        fullTranscript: getFullTranscript(),
      })
      if (suggestion) {
        setSuggestions((prev) => [...prev, suggestion])
      }
    } catch (err) {
      showToast(`LLM error: ${err instanceof Error ? err.message : 'Check your connection.'}`)
    } finally {
      setQuestionLoading(false)
    }
  }, [campaignContext, backstories, transcript, showToast])

  // --- Derived ---

  const isActive = sessionState === 'active'
  const isIdle = sessionState === 'idle'
  const visibleSuggestions = suggestions.filter((s) => !s.dismissed)

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--surface-950)', color: 'var(--surface-200)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: 'var(--surface-900)', borderBottom: '1px solid var(--surface-800)' }}
      >
        <div className="flex items-center gap-3">
          <h1
            className="font-display text-xl tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--amber-400)', fontWeight: 700 }}
          >
            The Primer
          </h1>
          {isActive && (
            <span
              className="text-xs font-medium px-2 py-0.5"
              style={{
                background: 'var(--success-muted)',
                color: 'var(--success)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              LIVE
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {isIdle && (
            <button
              onClick={loadDemo}
              className="text-xs px-3 py-1.5"
              style={{
                background: 'transparent',
                color: 'var(--surface-500)',
                border: '1px solid var(--surface-700)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-850)'; e.currentTarget.style.color = 'var(--surface-300)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--surface-500)' }}
            >
              Load Demo
            </button>
          )}
          {isIdle && (
            <button
              onClick={startSession}
              className="text-sm px-4 py-1.5 font-medium"
              style={{
                background: 'var(--accent)',
                color: 'var(--surface-950)',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              Start Session
            </button>
          )}
          {isActive && (
            <>
              <button
                onClick={handleSuggest}
                disabled={suggestLoading}
                className="text-sm px-4 py-1.5 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--surface-950)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: suggestLoading ? 'not-allowed' : 'pointer',
                  transition: 'background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={(e) => { if (!suggestLoading) { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' }}}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {suggestLoading ? 'Thinking...' : 'Suggest'}
              </button>
              <button
                onClick={endSession}
                className="text-sm px-4 py-1.5 font-medium"
                style={{
                  background: 'transparent',
                  color: 'var(--surface-400)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-700)',
                  cursor: 'pointer',
                  transition: 'background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-850)'; e.currentTarget.style.borderColor = 'var(--surface-600)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--surface-700)' }}
              >
                End Session
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content — Three Column GM Screen */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Campaign Reference */}
        <div
          className="flex flex-col p-3 overflow-hidden"
          style={{ borderRight: '1px solid var(--surface-800)', width: '220px', minWidth: '180px' }}
        >
          {isIdle ? (
            <CampaignEditor
              context={campaignContext}
              backstories={backstories}
              onContextChange={setCampaignContext}
              onBackstoriesChange={setBackstories}
              sessionActive={false}
            />
          ) : (
            <CampaignReference
              context={campaignContext}
              backstories={backstories}
              onAskAbout={handleFollowUp}
            />
          )}
        </div>

        {/* Center Column: Transcript */}
        <div
          className="flex-1 flex flex-col p-3 overflow-hidden"
          style={{ borderRight: '1px solid var(--surface-800)' }}
        >
          <TranscriptPanel
            entries={transcript}
            onAddEntry={addTranscriptEntry}
          />
        </div>

        {/* Right Column: Panic Buttons + Questions + Suggestions */}
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
          <PanicToolbar
            onPanic={handlePanic}
            disabled={!isActive}
            loading={panicLoading}
          />
          <QuestionInput
            onSubmit={handleQuestion}
            disabled={!isActive}
            loading={questionLoading}
          />
          <div className="flex-1 overflow-hidden">
            <SuggestionPanel
              suggestions={suggestions}
              onPin={handlePin}
              onDismiss={handleDismiss}
              onFollowUp={handleFollowUp}
            />
          </div>
        </div>
      </div>

      {/* API Key Setup Panel */}
      {showApiKeySetup && (
        <ApiKeySetup
          onSave={handleApiKeySave}
          onCancel={() => setShowApiKeySetup(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="px-4 py-2 text-sm"
          style={{
            background: 'var(--amber-900)',
            borderTop: '1px solid var(--amber-700)',
            color: 'var(--amber-300)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Status Bar */}
      <StatusBar
        sessionState={sessionState}
        providerName={activeProviderName}
        providerStatus={providerStatus}
        sessionElapsed={sessionElapsed}
        suggestionCount={visibleSuggestions.length}
        onProviderSwitch={handleProviderSwitch}
        onConfigureAnthropic={handleConfigureAnthropic}
        anthropicKeyConfigured={anthropicConfigured}
        loadingMessage={
          panicLoading ? 'Generating'
          : suggestLoading ? 'Thinking'
          : questionLoading ? 'Asking'
          : null
        }
      />
    </div>
  )
}

export default App
