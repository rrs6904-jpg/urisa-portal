import { createClient } from '@/lib/supabase/server'
import type { DashboardKpiRow } from '../../types/dashboard'

export async function getDashboardData(): Promise<DashboardKpiRow> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vw_kpi_dashboard')
    .select('*')
    .single()

  if (error) {
    throw new Error(`Error loading dashboard data: ${error.message}`)
  }

  return data as DashboardKpiRow
}