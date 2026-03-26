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
        className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || loading}
        className="bg-indigo-700 hover:bg-indigo-600 text-white text-sm px-4 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? '...' : 'Ask'}
      </button>
    </form>
  )
}
