export function Badge({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'error' | 'brand' }) {
  const variants = {
    default: 'bg-bg-elevated text-text-muted border border-bg-border',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    error: 'bg-error/10 text-error border border-error/20',
    brand: 'bg-brand-purple/20 text-brand-pink border border-brand-purple/30',
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${variants[variant]}`}>
      {children}
    </span>
  )
}
