import { useState, useEffect, type ReactNode } from 'react'

type Tab = {
  id: string
  label: string
  icon: string
  content: ReactNode
}

type Props = {
  tabs: Tab[]
  defaultTab?: string
  forceTab?: string | null  // external control — switches tab when set
}

export function MobileLayout({ tabs, defaultTab, forceTab }: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '')

  // Allow parent to force-switch tabs (e.g. on scenario load)
  useEffect(() => {
    if (forceTab && forceTab !== activeTab) {
      setActiveTab(forceTab)
    }
  }, [forceTab])

  const activeContent = tabs.find((t) => t.id === activeTab)?.content

  return (
    <div className="flex flex-col h-full">
      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeContent}
      </div>

      {/* Bottom tab bar */}
      <div
        className="flex items-center justify-around shrink-0"
        style={{
          background: 'var(--surface-900)',
          borderTop: '1px solid var(--surface-800)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-0.5 py-2 px-3"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--amber-400)' : 'var(--surface-500)',
                transition: 'color var(--duration-fast) var(--ease-out)',
              }}
            >
              <span style={{ fontSize: '18px' }}>{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
