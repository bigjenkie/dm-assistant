import { useState, useRef, useCallback, useEffect } from 'react'
import type { LLMProvider } from './lib/llm/provider'
import type { Suggestion, TranscriptEntry, PanicButtonId, SessionState, ProviderStatus, ProviderType } from './lib/types'
import { PANIC_BUTTONS } from './lib/types'
import { SuggestionEngine } from './lib/suggestion/engine'
import { validatePanicButton } from './lib/suggestion/panic-validation'
import { CampaignEditor } from './components/CampaignEditor'
import { ResizablePanels } from './components/ResizablePanel'
import { CampaignReference } from './components/CampaignReference'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SuggestionPanel } from './components/SuggestionPanel'
import { PanicToolbar } from './components/PanicToolbar'
import { QuestionInput } from './components/QuestionInput'
import { StatusBar } from './components/StatusBar'
import { ApiKeySetup } from './components/ApiKeySetup'
import { createAnthropicProvider } from './lib/llm/anthropic'
import { DEMO_CONTEXT, DEMO_BACKSTORIES, DEMO_TRANSCRIPT_ENTRIES } from './lib/test-data'
import { ScenarioPlayer } from './components/ScenarioPlayer'
import { ScenarioPicker } from './components/ScenarioPicker'
import { PlaybackControls } from './components/PlaybackControls'
import type { Scenario, ScenarioEntry } from './lib/scenarios'
import { MobileLayout } from './components/MobileLayout'
import { MiniTranscript } from './components/MiniTranscript'
import { useIsMobile } from './hooks/useIsMobile'

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
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null)
  const [showApiKeySetup, setShowApiKeySetup] = useState(false)
  const [anthropicConfigured, setAnthropicConfigured] = useState(!!anthropicProvider)
  const anthropicRef = useRef<LLMProvider | undefined>(anthropicProvider)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [scenarioPlaying, setScenarioPlaying] = useState(false)
  const [scenarioSpeed, setScenarioSpeed] = useState(1)
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const scenarioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const engineRef = useRef(new SuggestionEngine(anthropicProvider ?? provider))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef<number>(0)

  // Refs that mirror state — used by callbacks to always read latest values
  const campaignContextRef = useRef(campaignContext)
  const backstoriesRef = useRef(backstories)
  const transcriptRef = useRef(transcript)
  campaignContextRef.current = campaignContext
  backstoriesRef.current = backstories
  transcriptRef.current = transcript

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
    return transcriptRef.current.map((e) => `[${formatTs(e.ts)}] ${e.text}`).join('\n')
  }

  function getFullTranscript(): string {
    return getRecentTranscript()
  }

  function getContext() { return campaignContextRef.current }
  function getBackstories() { return backstoriesRef.current }

  function getCurrentElapsed(): number {
    if (sessionStartRef.current === 0) return 0
    return Math.floor((Date.now() - sessionStartRef.current) / 1000)
  }

  function formatTs(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

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

  const handleScenarioLoad = useCallback((scenario: Scenario) => {
    setCampaignContext(scenario.context)
    setBackstories(scenario.backstories)
    setTranscript([])
    setSuggestions([])

    setSessionState('active')
    sessionStartRef.current = Date.now()
    setSessionElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000))
    }, 1000)

    if (!anthropicRef.current) {
      setShowApiKeySetup(true)
    }

    // On mobile, switch to Primer tab where the action is
    setMobileForceTab('primer')
  }, [])

  const handleScenarioEntry = useCallback((entry: ScenarioEntry) => {
    const elapsed = getCurrentElapsed()
    setTranscript((prev) => [...prev, {
      id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ts: elapsed,
      text: `${entry.speaker}: ${entry.text}`,
      confidence: 1.0,
    }])
  }, [])

  // handleScenarioComplete defined after showToast below

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

  // --- Direct scenario control (used by ScenarioPicker on mobile) ---

  const scheduleScenarioEntry = useCallback((index: number, sc: Scenario, spd: number) => {
    if (scenarioTimerRef.current) clearTimeout(scenarioTimerRef.current)
    if (index >= sc.entries.length) {
      setScenarioPlaying(false)
      showToast('Scenario complete. Try the panic buttons and Suggest!')
      return
    }
    const entry = sc.entries[index]
    const prevDelay = index > 0 ? sc.entries[index - 1].delay : 0
    const gap = Math.max((entry.delay - prevDelay) * 1000 / spd, 200)

    scenarioTimerRef.current = setTimeout(() => {
      const elapsed = getCurrentElapsed()
      setTranscript((prev) => [...prev, {
        id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        ts: elapsed,
        text: `${entry.speaker}: ${entry.text}`,
        confidence: 1.0,
      }])
      setScenarioIndex(index + 1)
      scheduleScenarioEntry(index + 1, sc, spd)
    }, gap)
  }, [showToast])

  const startScenarioDirect = useCallback((sc: Scenario) => {
    // Load campaign data
    setCampaignContext(sc.context)
    setBackstories(sc.backstories)
    setTranscript([])
    setSuggestions([])
    setActiveScenario(sc)
    setScenarioIndex(0)
    setScenarioPlaying(true)

    // Start session
    setSessionState('active')
    sessionStartRef.current = Date.now()
    setSessionElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000))
    }, 1000)

    if (!anthropicRef.current) {
      setShowApiKeySetup(true)
    }

    // Switch to Primer tab on mobile
    setMobileForceTab('primer')

    // Start playback
    scheduleScenarioEntry(0, sc, scenarioSpeed)
  }, [scheduleScenarioEntry, scenarioSpeed])

  const toggleScenarioPlayback = useCallback(() => {
    if (!activeScenario) return
    if (scenarioPlaying) {
      if (scenarioTimerRef.current) clearTimeout(scenarioTimerRef.current)
      setScenarioPlaying(false)
    } else {
      setScenarioPlaying(true)
      scheduleScenarioEntry(scenarioIndex, activeScenario, scenarioSpeed)
    }
  }, [activeScenario, scenarioPlaying, scenarioIndex, scenarioSpeed, scheduleScenarioEntry])

  const changeScenarioSpeed = useCallback((spd: number) => {
    setScenarioSpeed(spd)
    if (scenarioPlaying && activeScenario) {
      if (scenarioTimerRef.current) clearTimeout(scenarioTimerRef.current)
      scheduleScenarioEntry(scenarioIndex, activeScenario, spd)
    }
  }, [scenarioPlaying, activeScenario, scenarioIndex, scheduleScenarioEntry])

  const resetScenario = useCallback(() => {
    if (scenarioTimerRef.current) clearTimeout(scenarioTimerRef.current)
    setActiveScenario(null)
    setScenarioPlaying(false)
    setScenarioIndex(0)
    setSessionState('idle')
    if (timerRef.current) clearInterval(timerRef.current)
    setMobileForceTab(null)
  }, [])

  const handleScenarioComplete = useCallback(() => {
    showToast('Scenario complete. Try the panic buttons and Suggest!')
  }, [showToast])

  // --- Suggest (Pull) ---

  const handleSuggest = useCallback(async () => {
    setSuggestLoading(true)
    const start = performance.now()
    try {
      const suggestion = await engineRef.current.runSuggest({
        campaignContext: getContext(),
        characterBackstories: getBackstories(),
        recentTranscript: getRecentTranscript(),
        fullTranscript: getFullTranscript(),
        sessionElapsed: getCurrentElapsed(),
      })
      setLastLatencyMs(Math.round(performance.now() - start))
      if (suggestion) {
        suggestion.trigger = 'Suggest'
        setSuggestions((prev) => [...prev, suggestion])
      } else {
        showToast('No suggestion for the current context — try adding more transcript.')
      }
    } catch (err) {
      setLastLatencyMs(Math.round(performance.now() - start))
      showToast(`LLM error: ${err instanceof Error ? err.message : 'Check your connection.'}`)
    } finally {
      setSuggestLoading(false)
    }
  }, [showToast])

  // --- Panic Buttons ---

  const handlePanic = useCallback(async (buttonId: PanicButtonId) => {
    const ctx = {
      campaignContext: getContext(),
      characterBackstories: getBackstories(),
      recentTranscript: getRecentTranscript(),
      fullTranscript: getFullTranscript(),
    }

    const warning = validatePanicButton(buttonId, ctx)
    if (warning) {
      showToast(warning)
      return
    }

    setPanicLoading(buttonId)
    const start = performance.now()
    try {
      const suggestion = await engineRef.current.runPanic(buttonId, ctx)
      setLastLatencyMs(Math.round(performance.now() - start))
      if (suggestion) {
        const btn = PANIC_BUTTONS.find((b) => b.id === buttonId)
        suggestion.trigger = btn ? `${btn.icon} ${btn.label}` : buttonId
        setSuggestions((prev) => [...prev, suggestion])
      } else {
        showToast('No suggestion generated — try a different button or add more context.')
      }
    } catch (err) {
      setLastLatencyMs(Math.round(performance.now() - start))
      showToast(`LLM error: ${err instanceof Error ? err.message : 'Check your connection.'}`)
    } finally {
      setPanicLoading(null)
    }
  }, [showToast])

  // --- Questions ---

  const handleQuestion = useCallback(async (question: string) => {
    setQuestionLoading(true)
    const start = performance.now()
    try {
      const suggestion = await engineRef.current.runQuestion(question, {
        campaignContext: getContext(),
        characterBackstories: getBackstories(),
        recentTranscript: getRecentTranscript(),
        fullTranscript: getFullTranscript(),
      })
      setLastLatencyMs(Math.round(performance.now() - start))
      if (suggestion) {
        suggestion.trigger = 'Question'
        setSuggestions((prev) => [...prev, suggestion])
      } else {
        showToast('No answer generated — try rephrasing your question.')
      }
    } catch (err) {
      setLastLatencyMs(Math.round(performance.now() - start))
      showToast(`LLM error: ${err instanceof Error ? err.message : 'Check your connection.'}`)
    } finally {
      setQuestionLoading(false)
    }
  }, [showToast])

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
    const start = performance.now()
    try {
      const suggestion = await engineRef.current.runQuestion(question, {
        campaignContext: getContext(),
        characterBackstories: getBackstories(),
        recentTranscript: getRecentTranscript(),
        fullTranscript: getFullTranscript(),
      })
      setLastLatencyMs(Math.round(performance.now() - start))
      if (suggestion) {
        suggestion.trigger = 'Follow-up'
        setSuggestions((prev) => [...prev, suggestion])
      }
    } catch (err) {
      setLastLatencyMs(Math.round(performance.now() - start))
      showToast(`LLM error: ${err instanceof Error ? err.message : 'Check your connection.'}`)
    } finally {
      setQuestionLoading(false)
    }
  }, [showToast])

  // --- Derived ---

  const isActive = sessionState === 'active'
  const isIdle = sessionState === 'idle'
  const visibleSuggestions = suggestions.filter((s) => !s.dismissed)
  const isMobile = useIsMobile()
  const [mobileForceTab, setMobileForceTab] = useState<string | null>(null)

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

      {/* Main Content */}
      {isMobile ? (
        <MobileLayout
          defaultTab="primer"
          forceTab={mobileForceTab}
          tabs={[
            {
              id: 'campaign',
              label: 'Campaign',
              icon: '📂',
              content: (
                <div className="flex flex-col p-3 h-full overflow-hidden gap-3">
                  {!activeScenario && (
                    <ScenarioPicker onSelect={startScenarioDirect} />
                  )}
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
              ),
            },
            {
              id: 'transcript',
              label: 'Transcript',
              icon: '🎙️',
              content: (
                <div className="flex flex-col p-3 h-full overflow-hidden">
                  <TranscriptPanel entries={transcript} />
                </div>
              ),
            },
            {
              id: 'primer',
              label: 'Primer',
              icon: '✨',
              content: (
                <div className="flex flex-col p-3 gap-2 h-full overflow-hidden">
                  {activeScenario && (
                    <PlaybackControls
                      playing={scenarioPlaying}
                      speed={scenarioSpeed}
                      progress={activeScenario.entries.length > 0 ? Math.round((scenarioIndex / activeScenario.entries.length) * 100) : 0}
                      total={activeScenario.entries.length}
                      current={scenarioIndex}
                      scenarioName={activeScenario.name}
                      onToggle={toggleScenarioPlayback}
                      onSpeedChange={changeScenarioSpeed}
                      onReset={resetScenario}
                    />
                  )}
                  <MiniTranscript
                    entries={transcript}
                    maxLines={3}
                    onTap={() => setMobileForceTab('transcript')}
                  />
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
              ),
            },
          ]}
        />
      ) : (
        <ResizablePanels
          panels={[
            {
              defaultWidth: 220,
              minWidth: 160,
              content: (
                <div className="flex flex-col p-3 h-full overflow-hidden gap-3">
                  <ScenarioPlayer
                    onLoad={handleScenarioLoad}
                    onEntry={handleScenarioEntry}
                    onComplete={handleScenarioComplete}
                  />
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
              ),
            },
            {
              flex: true,
              minWidth: 200,
              content: (
                <div className="flex flex-col p-3 h-full overflow-hidden">
                  <TranscriptPanel entries={transcript} />
                </div>
              ),
            },
            {
              flex: true,
              minWidth: 250,
              content: (
                <div className="flex flex-col p-3 gap-3 h-full overflow-hidden">
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
              ),
            },
          ]}
        />
      )}

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
        lastLatencyMs={lastLatencyMs}
      />
    </div>
  )
}

export default App
