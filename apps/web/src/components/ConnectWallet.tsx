'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-400" title={address}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {isPending ? 'Connecting...' : `Connect ${connector.name}`}
        </button>
      ))}
    </div>
  );
}

export function ConnectWalletButton() {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();

  if (isConnected) {
    return null;
  }

  // Use the first available connector (usually injected/MetaMask)
  const connector = connectors[0];
  if (!connector) {
    return (
      <p className="text-sm text-gray-500">
        No wallet detected. Please install MetaMask or another Ethereum wallet.
      </p>
    );
  }

  return (
    <button
      onClick={() => connect({ connector })}
      disabled={isPending}
      className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

export function WalletStatus() {
  const { address, isConnected, isConnecting } = useAccount();

  if (isConnecting) {
    return <span className="text-sm text-gray-500">Connecting...</span>;
  }

  if (!isConnected || !address) {
    return <span className="text-sm text-gray-500">Not connected</span>;
  }

  return (
    <span className="text-sm font-mono" title={address}>
      {address.slice(0, 6)}...{address.slice(-4)}
    </span>
  );
}
