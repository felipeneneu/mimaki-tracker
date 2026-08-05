import { useQuery } from '@tanstack/react-query'

interface JobFilters {
  startDate?: string
  endDate?: string
  search?: string
  inkMin?: number
  inkMax?: number
}

export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => window.api.jobsList(filters),
    staleTime: 30_000,
  })
}
