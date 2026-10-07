import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { DashboardKpiRow } from '../../types/dashboard'

export async function getDashboardData(): Promise<DashboardKpiRow> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/login')

  // The database checks the verified identity and the existing Dashboard permission.
  const { data, error } = await supabase.rpc('portal_dashboard_kpis')
  if (error?.code === '42501') redirect('/unauthorized')
  if (error || !data) throw new Error('No fue posible cargar los indicadores.')
  return data as DashboardKpiRow
}
