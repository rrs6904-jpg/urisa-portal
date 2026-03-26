export interface DashboardKpiRow {
  today: string
  as_of_date: string
  as_of_month_start: string
  as_of_year_start: string
  period_label: string
  fin_report_date: string | null
  fin_data_available: boolean
  fin_data_current: boolean
  fx_mxnusd: number | null
  fx_yesterday: number | null

  cash_mxn: number | null
  cash_usd: number | null
  raw_import_mxn: number | null
  raw_domestic_mxn: number | null
  raw_related_mxn: number | null
  raw_total_mxn: number | null

  daily_production_target: number | null
  workdays_mtd: number | null
  workdays_ytd: number | null
  yesterday_is_workday: boolean | null
  prod_target_mtd: number | null
  prod_target_ytd: number | null
  units_yesterday: number | null
  units_mtd: number | null
  units_ytd: number | null
  units_mtd_export: number | null
  units_mtd_domestic: number | null
  prod_achievement_mtd: number | null
  prod_achievement_ytd: number | null
  units_in_progress: number | null

  sales_mtd_mxn: number | null
  sales_mtd_export: number | null
  sales_mtd_domestic: number | null
  sales_ytd_mxn: number | null

  ar_total_mxn: number | null
  ar_export_mxn: number | null
  ar_domestic_mxn: number | null

  fg_units_total: number | null
  fg_units_export: number | null
  fg_units_domestic: number | null
}