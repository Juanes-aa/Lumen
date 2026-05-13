import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount: number, error: unknown): boolean => {
        if (error instanceof ApiError) {
          return error.status >= 500 && failureCount < 2
        }
        return false
      },
    },
  },
})
