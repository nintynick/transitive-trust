import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { mainnet } from 'wagmi/chains';

// Minimal wagmi config - auto-detects injected wallets (MetaMask, etc.)
// No explicit connectors needed - wagmi will detect available wallets
export const config = createConfig({
  chains: [mainnet],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [mainnet.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
