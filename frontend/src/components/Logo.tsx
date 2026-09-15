export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="7" r="3" stroke="#3fe1c7" strokeWidth="1.6" />
      <circle cx="18" cy="7" r="2.2" stroke="#7c8ba0" strokeWidth="1.6" />
      <circle cx="12" cy="18" r="2.6" stroke="#f0b43f" strokeWidth="1.6" />
      <path d="M8.4 8.6 10 15.3M15.9 8.4 13.7 15" stroke="#2c3849" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
