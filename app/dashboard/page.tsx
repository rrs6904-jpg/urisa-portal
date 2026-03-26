// app/dashboard/page.tsx

import { getDashboardData } from "../../lib/data/dashboard";

type DashboardRow = {
  as_of_date: string | null;
  fin_report_date: string | null;
  fx_mxnusd: number | null;

  daily_production_target: number | null;
  units_yesterday: number | null;
  units_in_progress: number | null;

  workdays_mtd: number | null;
  workdays_ytd: number | null;

  prod_target_mtd: number | null;
  prod_target_ytd: number | null;

  units_mtd: number | null;
  units_ytd: number | null;

  prod_achievement_mtd: number | null;
  prod_achievement_ytd: number | null;

  sales_mtd_mxn: number | null;
  sales_ytd_mxn: number | null;

  raw_import_mxn: number | null;
  raw_domestic_mxn: number | null;
  raw_related_mxn: number | null;

  fg_units_domestic: number | null;
  fg_units_export: number | null;

  cash_mxn: number | null;
  cash_usd: number | null;

  ar_domestic_mxn: number | null;
  ar_export_mxn: number | null;
};

/* ================================
FORMAT HELPERS
================================ */

function formatNumber(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("en-US");
}

function formatMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(1)}%`;
}

function formatFx(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v.toFixed(4);
}

function formatDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return d.toLocaleDateString("en-CA");
}

/* ================================
UI CELLS
================================ */

function LabelCell({
  children,
  inventory,
}: {
  children: React.ReactNode;
  inventory?: boolean;
}) {
  return (
    <div
      className={`px-2 py-[4px] text-[10px] border border-[#B8C9DC] ${
        inventory
          ? "bg-[#E7F0D5] text-[#4A5D23]"
          : "bg-[#E7ECF2] text-[#5C6570]"
      }`}
    >
      {children}
    </div>
  );
}

function ValueCell({
  children,
  green,
  warning,
}: {
  children: React.ReactNode;
  green?: boolean;
  warning?: boolean;
}) {
  let color = "text-[#135A9C]";

  if (green) color = "text-[#5B7B1F]";
  if (warning) color = "text-[#C68B00]";

  return (
    <div
      className={`px-2 py-[5px] text-[14px] border border-[#8FB4DB] bg-white text-center font-bold ${color}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-[8px] mb-[2px]">
      <div className="bg-[#1F6AA5] text-white text-[12px] font-bold px-3 py-[3px] uppercase tracking-[0.04em]">
        {title}
      </div>
    </div>
  );
}

/* ================================
TOP BAR
================================ */

function TopBar({
  date,
  fx,
}: {
  date: string | null;
  fx: number | null;
}) {
  return (
    <div className="w-full bg-[#305E97] text-white text-[11px] px-4 py-[5px] flex justify-between">
      <div>
        <span className="font-semibold mr-1">Last Update:</span>
        {formatDate(date)}
      </div>

      <div>
        <span className="font-semibold mr-1">FX MXN/USD:</span>
        {formatFx(fx)}
      </div>
    </div>
  );
}

/* ================================
MAIN PAGE
================================ */

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const row = (await getDashboardData()) as DashboardRow | null;

  if (!row) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Error loading dashboard data
      </div>
    );
  }

  const lastUpdate = row.fin_report_date || row.as_of_date;

  return (
    <div className="min-h-screen bg-[#E9EAEC] flex justify-center py-2 px-2">

      <div className="w-full max-w-[1180px]">

        {/* HEADER */}
        <div className="bg-[#234774] text-white text-center py-[10px]">
          <h1 className="text-[16px] font-bold">
            URISA Enterprise System | Executive Dashboard
          </h1>
        </div>

        <TopBar date={row.as_of_date} fx={row.fx_mxnusd} />

        {/* ========================
        PRODUCTION
        ======================== */}

        <SectionHeader title="PRODUCTION" />

        <div className="grid grid-cols-[300px_1fr_1fr] gap-0">

          {/* LEFT */}
          <div className="grid grid-cols-2">

            <LabelCell>Daily Target</LabelCell>
            <ValueCell>{formatNumber(row.daily_production_target)}</ValueCell>

            <LabelCell>
              Production Yesterday
              <div className="text-[9px]">(Completed)</div>
            </LabelCell>
            <ValueCell>{formatNumber(row.units_yesterday)}</ValueCell>

            <LabelCell>Achievement % Day</LabelCell>
            <ValueCell>{row.units_yesterday ? "0.0%" : "—"}</ValueCell>

            <LabelCell>In Progress</LabelCell>
            <ValueCell warning>
              {formatNumber(row.units_in_progress)}
            </ValueCell>

            <LabelCell>Workdays MTD</LabelCell>
            <ValueCell>{formatNumber(row.workdays_mtd)}</ValueCell>

          </div>

          {/* CENTER */}
          <div className="grid grid-cols-2">

            <LabelCell>Target MTD</LabelCell>
            <ValueCell>{formatNumber(row.prod_target_mtd)}</ValueCell>

            <LabelCell>Production MTD</LabelCell>
            <ValueCell>{formatNumber(row.units_mtd)}</ValueCell>

            <LabelCell>MTD Achievement %</LabelCell>
            <ValueCell>{formatPercent(row.prod_achievement_mtd)}</ValueCell>

          </div>

          {/* RIGHT */}
          <div className="grid grid-cols-2">

            <LabelCell>Target YTD</LabelCell>
            <ValueCell>{formatNumber(row.prod_target_ytd)}</ValueCell>

            <LabelCell>Production YTD</LabelCell>
            <ValueCell>{formatNumber(row.units_ytd)}</ValueCell>

            <LabelCell>YTD Achievement %</LabelCell>
            <ValueCell>{formatPercent(row.prod_achievement_ytd)}</ValueCell>

            <LabelCell>Workdays YTD</LabelCell>
            <ValueCell>{formatNumber(row.workdays_ytd)}</ValueCell>

          </div>

        </div>

        {/* ========================
        SALES
        ======================== */}

        <SectionHeader title="SALES" />

        <div className="grid grid-cols-[300px_1fr_1fr]">

          <div className="grid grid-cols-2">

            <LabelCell>Sales Yesterday MXN</LabelCell>
            <ValueCell>0.00</ValueCell>

            <LabelCell>in USD</LabelCell>
            <ValueCell>0.00</ValueCell>

            <LabelCell>% Export</LabelCell>
            <ValueCell>49.7%</ValueCell>

          </div>

          <div className="grid grid-cols-2">

            <LabelCell>Sales MTD MXN</LabelCell>
            <ValueCell>{formatMoney(row.sales_mtd_mxn)}</ValueCell>

            <LabelCell>in USD</LabelCell>
            <ValueCell>28,823.49</ValueCell>

            <LabelCell>of YTD Total</LabelCell>
            <ValueCell>—</ValueCell>

          </div>

          <div className="grid grid-cols-2">

            <LabelCell>Sales YTD MXN</LabelCell>
            <ValueCell>{formatMoney(row.sales_ytd_mxn)}</ValueCell>

            <LabelCell>in USD</LabelCell>
            <ValueCell>333,157.97</ValueCell>

            <LabelCell>% Domestic</LabelCell>
            <ValueCell>50.3%</ValueCell>

          </div>

        </div>

        {/* ========================
        INVENTORY
        ======================== */}

        <SectionHeader title="INVENTORY" />

        <div className="space-y-[2px]">

          <div className="grid grid-cols-3">

            <div className="grid grid-cols-2">
              <LabelCell inventory>Import Raw Material MXN</LabelCell>
              <ValueCell green>{formatMoney(row.raw_import_mxn)}</ValueCell>
            </div>

            <div className="grid grid-cols-2">
              <LabelCell inventory>Domestic Raw Material MXN</LabelCell>
              <ValueCell green>{formatMoney(row.raw_domestic_mxn)}</ValueCell>
            </div>

            <div className="grid grid-cols-2">
              <LabelCell inventory>Related Party Raw Material MXN</LabelCell>
              <ValueCell green>{formatMoney(row.raw_related_mxn)}</ValueCell>
            </div>

          </div>

          <div className="grid grid-cols-2">

            <div className="grid grid-cols-[1fr_120px_80px]">

              <LabelCell inventory>Domestic Inventory Available</LabelCell>
              <ValueCell green>
                {formatNumber(row.fg_units_domestic)}
              </ValueCell>
              <LabelCell inventory>units</LabelCell>

            </div>

            <div className="grid grid-cols-[1fr_120px_80px]">

              <LabelCell inventory>Export Inventory Available</LabelCell>
              <ValueCell green>
                {formatNumber(row.fg_units_export)}
              </ValueCell>
              <LabelCell inventory>units</LabelCell>

            </div>

          </div>

        </div>

        {/* ========================
        FINANCIALS
        ======================== */}

        <SectionHeader title="FINANCIALS" />

        <div className="grid grid-cols-[1fr_1fr_0.8fr]">

          <div className="grid grid-cols-2">

            <LabelCell>Cash MXN</LabelCell>
            <ValueCell>{formatMoney(row.cash_mxn)}</ValueCell>

            <LabelCell>AR Domestic MXN</LabelCell>
            <ValueCell>{formatMoney(row.ar_domestic_mxn)}</ValueCell>

            <LabelCell>AR Export MXN</LabelCell>
            <ValueCell>{formatMoney(row.ar_export_mxn)}</ValueCell>

          </div>

          <div className="grid grid-cols-2">

            <LabelCell>Cash USD</LabelCell>
            <ValueCell>{formatMoney(row.cash_usd)}</ValueCell>

            <LabelCell>AR Domestic USD</LabelCell>
            <ValueCell>67,602.73</ValueCell>

            <LabelCell>AR Export USD</LabelCell>
            <ValueCell>165,490.06</ValueCell>

          </div>

          <div className="grid grid-cols-2">

            <LabelCell>Last Update</LabelCell>
            <ValueCell>
              {formatDate(lastUpdate)}
            </ValueCell>

          </div>

        </div>

      </div>

    </div>
  );
}