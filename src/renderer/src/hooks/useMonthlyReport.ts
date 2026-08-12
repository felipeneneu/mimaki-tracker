import { useQuery } from '@tanstack/react-query'

export function useMonthlyReport() {
  return useQuery({
    queryKey: ['monthlyReport'],
    queryFn: () => window.api.monthlyReport(),
    staleTime: 60_000,
  })
}
