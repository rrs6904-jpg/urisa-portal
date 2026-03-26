import { getDashboardData } from '../../lib/data/dashboard'
import {
  formatCurrencyMXN,
  formatCurrencyUSD,
  formatFx,
  formatNumber,
  formatPercent,
} from '../../lib/format/dashboard'

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center bg-[#1F6AA5] px-4 py-1.5 text-white">
      <h2 className="text-base font-bold uppercase tracking-wide">{title}</h2>
    </div>
  )
}

function LabelCell({
  label,
  sublabel,
  tone = 'default',
}: {
  label: string
  sublabel?: string
  tone?: 'default' | 'inventory'
}) {
  return (
    <div
      className={[
        'border-r border-b border-slate-300 px-3 py-1.5 text-[12px] leading-tight text-slate-700',
        tone === 'inventory' ? 'bg-[#E7F0D5]' : 'bg-[#F3F4F6]',
      ].join(' ')}
    >
      <div className="font-semibold">{label}</div>
      {sublabel ? (
        <div className="mt-0.5 text-[11px] italic text-slate-500">{sublabel}</div>
      ) : null}
    </div>
  )
}

function ValueCell({
  value,
  tone = 'default',
  emphasis = false,
}: {
  value: string
  tone?: 'default' | 'inventory'
  emphasis?: boolean
}) {
  return (
    <div
      className={[
        'border-r border-b border-[#4B89C8] px-3 py-1.5 text-center',
        tone === 'inventory' ? 'bg-[#EDF5DD]' : 'bg-white',
      ].join(' ')}
    >
      <div
        className={[
          'font-bold text-[#135A9C]',
          emphasis ? 'text-[18px]' : 'text-[16px]',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}

function PairRow({
  label,
  value,
  sublabel,
  tone = 'default',
  emphasis = false,
}: {
  label: string
  value: string
  sublabel?: string
  tone?: 'default' | 'inventory'
  emphasis?: boolean
}) {
  return (
    <>
      <LabelCell label={label} sublabel={sublabel} tone={tone} />
      <ValueCell value={value} tone={tone} emphasis={emphasis} />
    </>
  )
}

function VerticalMetricGroup({
  items,
  tone = 'default',
}: {
  items: Array<{
    label: string
    value: string
    sublabel?: string
    emphasis?: boolean
  }>
  tone?: 'default' | 'inventory'
}) {
  return (
    <div className="grid grid-cols-[1fr_165px] border-l border-t border-slate-300">
      {items.map((item) => (
        <PairRow
          key={item.label}
          label={item.label}
          value={item.value}
          sublabel={item.sublabel}
          tone={tone}
          emphasis={item.emphasis}
        />
      ))}
    </div>
  )
}

function TopInfoBar({
  lastUpdate,
  fx,
}: {
  lastUpdate: string
  fx: string
}) {
  return (
    <div className="grid grid-cols-2 bg-[#305E97] px-4 py-2 text-white">
      <div className="text-sm font-semibold">Last Update: {lastUpdate}</div>
      <div className="text-center text-sm font-semibold">FX MXN/USD: {fx}</div>
    </div>
  )
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const productionLeft = [
    {
      label: 'Daily Target',
      value: formatNumber(data.daily_production_target),
      emphasis: true,
    },
    {
      label: 'Production Yesterday',
      value: formatNumber(data.units_yesterday),
      sublabel: '(Completed)',
      emphasis: true,
    },
    {
      label: 'Achievement % Day',
      value: '—',
      emphasis: true,
    },
    {
      label: 'In Progress',
      value: formatNumber(data.units_in_progress),
      emphasis: true,
    },
    {
      label: 'Workdays MTD',
      value: formatNumber(data.workdays_mtd),
      emphasis: true,
    },
  ]

  const productionMiddle = [
    {
      label: 'Target MTD',
      value: formatNumber(data.prod_target_mtd),
      emphasis: true,
    },
    {
      label: 'Production MTD',
      value: formatNumber(data.units_mtd),
      emphasis: true,
    },
    {
      label: 'MTD Achievement %',
      value: formatPercent(data.prod_achievement_mtd),
      emphasis: true,
    },
  ]

  const productionRight = [
    {
      label: 'Target YTD',
      value: formatNumber(data.prod_target_ytd),
      emphasis: true,
    },
    {
      label: 'Production YTD',
      value: formatNumber(data.units_ytd),
      emphasis: true,
    },
    {
      label: 'YTD Achievement %',
      value: formatPercent(data.prod_achievement_ytd),
      emphasis: true,
    },
    {
      label: 'Workdays YTD',
      value: formatNumber(data.workdays_ytd),
      emphasis: true,
    },
  ]

  const salesLeft = [
    {
      label: 'Sales Yesterday MXN',
      value: '—',
      emphasis: true,
    },
    {
      label: 'in USD:',
      value: '—',
      emphasis: true,
    },
    {
      label: '% Export',
      value: '—',
      emphasis: true,
    },
  ]

  const salesMiddle = [
    {
      label: 'Sales MTD MXN',
      value: formatCurrencyMXN(data.sales_mtd_mxn),
      emphasis: true,
    },
    {
      label: 'in USD:',
      value: '—',
      emphasis: true,
    },
    {
      label: 'of YTD Total',
      value: '—',
      emphasis: true,
    },
  ]

  const salesRight = [
    {
      label: 'Sales YTD MXN',
      value: formatCurrencyMXN(data.sales_ytd_mxn),
      emphasis: true,
    },
    {
      label: 'in USD:',
      value: '—',
      emphasis: true,
    },
    {
      label: '% Domestic',
      value: '—',
      emphasis: true,
    },
  ]

  const inventoryTop = [
    {
      label: 'Import Raw Material MXN',
      value: formatCurrencyMXN(data.raw_import_mxn),
      sublabel: 'Imported materials (Finance)',
    },
    {
      label: 'Domestic Raw Material MXN',
      value: formatCurrencyMXN(data.raw_domestic_mxn),
      sublabel: 'Domestic materials (Finance)',
    },
    {
      label: 'Related Party Raw Material MXN',
      value: formatCurrencyMXN(data.raw_related_mxn),
      sublabel: 'Related party materials (Finance)',
    },
  ]

  const inventoryBottom = [
    {
      label: 'Domestic Inventory Available',
      value: formatNumber(data.fg_units_domestic),
      sublabel: 'Finished goods available — Domestic channel',
    },
    {
      label: 'Export Inventory Available',
      value: formatNumber(data.fg_units_export),
      sublabel: 'Finished goods available — Export channel',
    },
  ]

  const financialLeft = [
    {
      label: 'Cash MXN',
      value: formatCurrencyMXN(data.cash_mxn),
      emphasis: true,
    },
    {
      label: 'AR Domestic MXN',
      value: formatCurrencyMXN(data.ar_domestic_mxn),
      emphasis: true,
    },
    {
      label: 'AR Export MXN',
      value: formatCurrencyMXN(data.ar_export_mxn),
      emphasis: true,
    },
  ]

  const financialMiddle = [
    {
      label: 'Cash USD',
      value: formatCurrencyUSD(data.cash_usd),
      emphasis: true,
    },
    {
      label: 'AR Domestic USD (ref.)',
      value: '—',
      emphasis: true,
    },
    {
      label: 'AR Export USD (ref.)',
      value: '—',
      emphasis: true,
    },
  ]

  const financialRight = [
    {
      label: 'Last Update',
      value: data.fin_report_date ?? data.as_of_date ?? '—',
      emphasis: true,
    },
  ]

  return (
    <div className="min-h-screen bg-[#E9EAEC] px-4 py-6">
      <div className="mx-auto max-w-[1180px] bg-[#E9EAEC]">
        <header className="overflow-hidden border border-slate-300 bg-white shadow-sm">
          <div className="bg-[#234774] px-6 py-4 text-center text-white">
            <h1 className="text-[22px] font-bold tracking-tight">
              URISA Enterprise System&nbsp;&nbsp;|&nbsp;&nbsp;Executive Dashboard
            </h1>
          </div>
          <TopInfoBar
            lastUpdate={data.as_of_date ?? '—'}
            fx={formatFx(data.fx_mxnusd)}
          />
        </header>

        <div className="mt-3 space-y-2">
          <section>
            <SectionHeader title="Production" />
            <div className="grid grid-cols-[300px_1fr_1fr] gap-0 bg-[#E9EAEC]">
              <VerticalMetricGroup items={productionLeft} />
              <VerticalMetricGroup items={productionMiddle} />
              <VerticalMetricGroup items={productionRight} />
            </div>
          </section>

          <section>
            <SectionHeader title="Sales" />
            <div className="grid grid-cols-[300px_1fr_1fr] gap-0 bg-[#E9EAEC]">
              <VerticalMetricGroup items={salesLeft} />
              <VerticalMetricGroup items={salesMiddle} />
              <VerticalMetricGroup items={salesRight} />
            </div>
          </section>

          <section>
            <SectionHeader title="Inventory" />
            <div className="space-y-0">
              <div className="grid grid-cols-3 gap-0">
                {inventoryTop.map((item) => (
                  <VerticalMetricGroup
                    key={item.label}
                    items={[item]}
                    tone="inventory"
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-0">
                {inventoryBottom.map((item) => (
                  <VerticalMetricGroup
                    key={item.label}
                    items={[item]}
                    tone="inventory"
                  />
                ))}
              </div>
            </div>
          </section>

          <section>
            <SectionHeader title="Financials" />
            <div className="grid grid-cols-[300px_1fr_1fr] gap-0 bg-[#E9EAEC]">
              <VerticalMetricGroup items={financialLeft} />
              <VerticalMetricGroup items={financialMiddle} />
              <VerticalMetricGroup items={financialRight} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}