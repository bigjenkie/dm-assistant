import { useRef, useCallback, useState, type ReactNode } from 'react'

type PanelConfig = {
  content: ReactNode
  defaultWidth?: number  // px, only for non-flex panels
  minWidth?: number      // px
  flex?: boolean         // if true, takes remaining space
}

type Props = {
  panels: PanelConfig[]
}

export function ResizablePanels({ panels }: Props) {
  // Initialize widths from defaults
  const [widths, setWidths] = useState<number[]>(() =>
    panels.map((p) => p.defaultWidth ?? 300)
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<{ index: number; startX: number; startWidths: number[] } | null>(null)

  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = {
      index,
      startX: e.clientX,
      startWidths: [...widths],
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const { index, startX, startWidths } = draggingRef.current
      const delta = e.clientX - startX

      const newWidths = [...startWidths]
      const leftMin = panels[index].minWidth ?? 120
      const rightMin = panels[index + 1].minWidth ?? 120

      const newLeft = startWidths[index] + delta
      const newRight = startWidths[index + 1] - delta

      if (newLeft >= leftMin && newRight >= rightMin) {
        newWidths[index] = newLeft
        newWidths[index + 1] = newRight
        setWidths(newWidths)
      }
    }

    const handleMouseUp = () => {
      draggingRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [widths, panels])

  // On first render with a container, distribute flex space
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    containerRef.current = node

    const totalFixed = panels.reduce((sum, p, i) => {
      if (p.flex) return sum
      return sum + (widths[i] ?? p.defaultWidth ?? 300)
    }, 0)
    const dividerSpace = (panels.length - 1) * 6
    const remaining = node.offsetWidth - totalFixed - dividerSpace
    const flexCount = panels.filter((p) => p.flex).length

    if (flexCount > 0 && remaining > 0) {
      const flexWidth = remaining / flexCount
      setWidths((prev) =>
        prev.map((w, i) => panels[i].flex ? flexWidth : w)
      )
    }
  }, [panels])

  return (
    <div ref={measureRef} className="flex flex-1 overflow-hidden">
      {panels.map((panel, i) => (
        <div key={i} className="flex" style={{ width: 'fit-content' }}>
          {/* Panel content */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ width: `${widths[i]}px` }}
          >
            {panel.content}
          </div>

          {/* Divider (not after last panel) */}
          {i < panels.length - 1 && (
            <div
              onMouseDown={(e) => handleMouseDown(i, e)}
              style={{
                width: '6px',
                cursor: 'col-resize',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                const line = e.currentTarget.firstElementChild as HTMLElement
                if (line) line.style.background = 'var(--amber-700)'
              }}
              onMouseLeave={(e) => {
                const line = e.currentTarget.firstElementChild as HTMLElement
                if (line) line.style.background = 'var(--surface-800)'
              }}
            >
              <div
                style={{
                  width: '1px',
                  height: '100%',
                  background: 'var(--surface-800)',
                  transition: 'background var(--duration-fast) var(--ease-out)',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
