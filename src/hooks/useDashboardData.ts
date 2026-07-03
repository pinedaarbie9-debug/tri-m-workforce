import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface CheckinRow {
  id: string
  merchandiser_name: string
  check_in_time: string
  store_name: string
  status: string
}

export interface DashboardSummary {
  deployedToday: number
  absentAwol: number
  pendingLeaves: number
  recentCheckins: CheckinRow[]
  loading: boolean
  error: string | null
}

const today = new Date().toISOString().slice(0, 10)

export function useDashboardData(): DashboardSummary {
  const [state, setState] = useState<Omit<DashboardSummary, 'loading' | 'error'>>({
    deployedToday: 0,
    absentAwol: 0,
    pendingLeaves: 0,
    recentCheckins: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const [{ count: deployed }, { count: absent }, { count: pending }, { data: checkins }] =
          await Promise.all([
            supabase
              .from('attendance_logs')
              .select('id', { count: 'exact', head: true })
              .gte('check_in_time', `${today}T00:00:00`),
            supabase
              .from('attendance_logs')
              .select('id', { count: 'exact', head: true })
              .in('status', ['absent', 'awol'])
              .gte('check_in_time', `${today}T00:00:00`),
            supabase
              .from('leave_requests')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending'),
            supabase
              .from('attendance_logs')
              .select('id, check_in_time, status, merchandisers(full_name), stores(name)')
              .order('check_in_time', { ascending: false })
              .limit(5)
          ])

        if (!isMounted) return

        setState({
          deployedToday: deployed ?? 0,
          absentAwol: absent ?? 0,
          pendingLeaves: pending ?? 0,
          recentCheckins: (checkins ?? []).map((c: any) => ({
            id: c.id,
            merchandiser_name: c.merchandisers?.full_name ?? 'Unknown',
            check_in_time: c.check_in_time,
            store_name: c.stores?.name ?? 'Unknown store',
            status: c.status
          }))
        })
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  return { ...state, loading, error }
}
