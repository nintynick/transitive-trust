import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet, metaMask } from '@wagmi/connectors';
import type { CreateConnectorFn } from 'wagmi';

// WalletConnect Project ID - get one at https://cloud.walletconnect.com
// This enables mobile wallet connections via WalletConnect protocol
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Build connectors list - WalletConnect only included if project ID is configured
const connectors: CreateConnectorFn[] = [
  // MetaMask - most popular wallet
  metaMask({
    dappMetadata: {
      name: 'Transitive Trust Protocol',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://transitivetrust.xyz',
    },
  }),
  // Coinbase Wallet - popular mobile wallet
  coinbaseWallet({
    appName: 'Transitive Trust Protocol',
  }),
  // Other injected wallets (browser extensions)
  injected({
    shimDisconnect: true,
  }),
];

// Only add WalletConnect if a valid project ID is configured
if (walletConnectProjectId) {
  connectors.push(
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
      metadata: {
        name: 'Transitive Trust Protocol',
        description: 'A decentralized system for perspectival trust and reputation',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://transitivetrust.xyz',
        icons: [],
      },
    })
  );
}

// Configure connectors for desktop and mobile
export const config = createConfig({
  chains: [mainnet],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  connectors,
  transports: {
    [mainnet.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
