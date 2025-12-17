'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { TRPCProvider, getQueryClient } from '@/lib/trpc';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <TRPCProvider queryClient={queryClient}>{children}</TRPCProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
