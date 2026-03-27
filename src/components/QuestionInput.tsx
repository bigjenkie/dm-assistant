type Props = {
  onSubmit: (question: string) => void
  disabled: boolean
  loading: boolean
}

export function QuestionInput({ onSubmit, disabled, loading }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem('question-input') as HTMLInputElement
    const text = input.value.trim()
    if (text) {
      onSubmit(text)
      input.value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="question-input"
        type="text"
        placeholder="Ask a question (rules, NPCs, encounters...)"
        disabled={disabled}
        className="flex-1 text-sm px-3 py-1.5 disabled:opacity-40"
        style={{
          background: 'var(--surface-900)',
          border: '1px solid var(--surface-700)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--surface-200)',
          outline: 'none',
          transition: 'border-color var(--duration-fast) var(--ease-out)',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber-700)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--surface-700)' }}
      />
      <button
        type="submit"
        disabled={disabled || loading}
        className="text-sm px-4 py-1.5 font-medium disabled:opacity-35 disabled:cursor-not-allowed"
        style={{
          background: 'var(--amber-700)',
          color: 'var(--surface-100)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          transition: 'background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
        }}
        onMouseEnter={(e) => { if (!disabled && !loading) { e.currentTarget.style.background = 'var(--amber-600)'; e.currentTarget.style.transform = 'translateY(-1px)' }}}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--amber-700)'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        {loading ? '...' : 'Ask'}
      </button>
    </form>
  )
}
