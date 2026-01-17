'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * React Query Provider wrapper for the application
 * Creates a QueryClient instance with sensible defaults
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside component to avoid sharing state between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus in dev
            refetchOnWindowFocus: false,
            // Retry failed requests 2 times
            retry: 2,
            // Cache data for 5 minutes
            staleTime: 5 * 60 * 1000,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
