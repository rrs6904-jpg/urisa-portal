interface KpiCardProps {
  label: string
  value: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
}

function toneClasses(tone: KpiCardProps['tone']) {
  switch (tone) {
    case 'good':
      return 'border-green-200 bg-green-50'
    case 'warn':
      return 'border-amber-200 bg-amber-50'
    case 'bad':
      return 'border-red-200 bg-red-50'
    default:
      return 'border-slate-200 bg-white'
  }
}

export default function KpiCard({
  label,
  value,
  tone = 'default',
}: KpiCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all ${toneClasses(
        tone
      )}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  )
}