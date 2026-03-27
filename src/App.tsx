import { useState, useRef, useCallback, useEffect } from 'react'
import type { LLMProvider } from './lib/llm/provider'
import type { Suggestion, TranscriptEntry, PanicButtonId, SessionState, ProviderStatus } from './lib/types'
import { SuggestionEngine } from './lib/suggestion/engine'
import { validatePanicButton } from './lib/suggestion/panic-validation'
import { CampaignEditor } from './components/CampaignEditor'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SuggestionPanel } from './components/SuggestionPanel'
import { PanicToolbar } from './components/PanicToolbar'
import { QuestionInput } from './components/QuestionInput'
import { StatusBar } from './components/StatusBar'

type Props = {
  provider: LLMProvider
}

function App({ provider }: Props) {
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
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const engineRef = useRef(new SuggestionEngine(provider))
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

  // --- Suggest (Pull) ---

  const handleSuggest = useCallback(async () => {
    setSuggestLoading(true)
    try {
      const suggestion = await engineRef.current.runSuggest({
        campaignContext,
        characterBackstories: backstories,
        recentTranscript: getRecentTranscript(),
        fullTranscript: getFullTranscript(),
        sessionElapsed: getCurrentElapsed(),
      })
      if (suggestion) {
        setSuggestions((prev) => [...prev, suggestion])
      }
    } finally {
      setSuggestLoading(false)
    }
  }, [campaignContext, backstories, transcript])

  // --- Toast ---

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), 4000)
  }, [])

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

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
      }
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
      }
    } finally {
      setQuestionLoading(false)
    }
  }, [campaignContext, backstories, transcript])

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
            DM Assistant
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

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Campaign + Transcript */}
        <div
          className="w-1/2 flex flex-col p-4 gap-4 overflow-hidden"
          style={{ borderRight: '1px solid var(--surface-800)' }}
        >
          <CampaignEditor
            context={campaignContext}
            backstories={backstories}
            onContextChange={setCampaignContext}
            onBackstoriesChange={setBackstories}
            sessionActive={!isIdle}
          />
          <div className="flex-1 overflow-hidden">
            <TranscriptPanel
              entries={transcript}
              onAddEntry={addTranscriptEntry}
            />
          </div>
        </div>

        {/* Right Column: Panic Buttons + Questions + Suggestions */}
        <div className="w-1/2 flex flex-col p-4 gap-4 overflow-hidden">
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
            />
          </div>
        </div>
      </div>

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
        providerName={provider.name}
        providerStatus={providerStatus}
        sessionElapsed={sessionElapsed}
        suggestionCount={visibleSuggestions.length}
      />
    </div>
  )
}

export default App
