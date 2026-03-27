type Props = {
  message?: string
}

export function LoadingSpinner({ message = 'Thinking...' }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 py-8"
      role="status"
      aria-label="Loading"
    >
      <div
        className="animate-spin"
        style={{
          width: '24px',
          height: '24px',
          border: '2px solid var(--surface-800)',
          borderTopColor: 'var(--amber-500)',
          borderRadius: '50%',
        }}
      />
      <span className="text-xs" style={{ color: 'var(--surface-500)' }}>
        {message}
      </span>
    </div>
  )
}
