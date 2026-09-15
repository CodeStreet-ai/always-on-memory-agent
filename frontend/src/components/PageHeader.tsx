export default function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-2xl font-semibold text-ink-100">{title}</h1>
      <p className="text-sm text-ink-400 mt-1.5 max-w-xl leading-relaxed">{description}</p>
    </header>
  )
}
