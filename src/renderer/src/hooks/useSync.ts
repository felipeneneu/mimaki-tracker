import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useSync() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => window.api.syncResyncAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
