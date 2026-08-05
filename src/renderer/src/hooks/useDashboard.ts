import { useQuery } from '@tanstack/react-query'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return window.api.jobsList({ startDate: d.toISOString().split('T')[0] })
    },
    staleTime: 60_000,
  })
}
