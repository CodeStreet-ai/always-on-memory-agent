import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-signal-500 text-ink-950 hover:bg-signal-400 disabled:bg-ink-700 disabled:text-ink-500',
  secondary: 'bg-ink-800 text-ink-100 border border-ink-700 hover:border-ink-600 hover:bg-ink-800/70',
  danger: 'bg-transparent text-coral-400 border border-coral-600/40 hover:bg-coral-600/10',
  ghost: 'bg-transparent text-ink-400 hover:text-ink-100',
}

export default function Button({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
