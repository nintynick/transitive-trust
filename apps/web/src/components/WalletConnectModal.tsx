'use client';

import { useState, useEffect } from 'react';
import { useConnect } from 'wagmi';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Wallet icons as simple SVGs
const WalletIcons = {
  MetaMask: (
    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
      <rect width="40" height="40" rx="8" fill="#F6851B"/>
      <path d="M32.9 8L21.5 16.5l2.1-5L32.9 8z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.1 8l11.3 8.6-2-5.1L7.1 8zm22.5 18.3l-3 4.6 6.4 1.8 1.9-6.3-5.3-.1zm-23.7.1l1.8 6.3 6.4-1.8-3-4.6-5.2.1z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.8 18.2l-1.8 2.8 6.4.3-.2-6.9-4.4 3.8zm12.4 0l-4.5-3.9-.1 7 6.4-.3-1.8-2.8zm-12.4 13l3.9-1.9-3.3-2.6-.6 4.5zm8.5-1.9l3.9 1.9-.6-4.5-3.3 2.6z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  WalletConnect: (
    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
      <rect width="40" height="40" rx="8" fill="#3B99FC"/>
      <path d="M12.5 15.5c4.1-4 10.9-4 15 0l.5.5c.2.2.2.5 0 .7l-1.7 1.7c-.1.1-.3.1-.4 0l-.7-.7c-2.9-2.8-7.6-2.8-10.5 0l-.7.7c-.1.1-.3.1-.4 0l-1.7-1.7c-.2-.2-.2-.5 0-.7l.6-.5zm18.5 3.5l1.5 1.5c.2.2.2.5 0 .7l-6.8 6.6c-.2.2-.5.2-.7 0l-4.8-4.7c0-.1-.1-.1-.2 0l-4.8 4.7c-.2.2-.5.2-.7 0L7.5 21c-.2-.2-.2-.5 0-.7l1.5-1.5c.2-.2.5-.2.7 0l4.8 4.7c0 .1.1.1.2 0l4.8-4.7c.2-.2.5-.2.7 0l4.8 4.7c0 .1.1.1.2 0l4.8-4.7c.2-.2.5-.2.7 0z" fill="#fff"/>
    </svg>
  ),
  Coinbase: (
    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
      <rect width="40" height="40" rx="8" fill="#0052FF"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M20 32c6.627 0 12-5.373 12-12S26.627 8 20 8 8 13.373 8 20s5.373 12 12 12zm-4-14a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z" fill="#fff"/>
    </svg>
  ),
  Injected: (
    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
      <rect width="40" height="40" rx="8" fill="#627EEA"/>
      <path d="M20 8v9.36l7.9 3.53L20 8z" fill="#fff" fillOpacity=".602"/>
      <path d="M20 8l-7.9 12.89 7.9-3.53V8z" fill="#fff"/>
      <path d="M20 24.93v7.06l7.9-10.92L20 24.93z" fill="#fff" fillOpacity=".602"/>
      <path d="M20 31.99v-7.06l-7.9-3.85L20 31.99z" fill="#fff"/>
      <path d="M20 23.42l7.9-4.53L20 15.36v8.06z" fill="#fff" fillOpacity=".2"/>
      <path d="M12.1 18.89l7.9 4.53v-8.06l-7.9 3.53z" fill="#fff" fillOpacity=".602"/>
    </svg>
  ),
};

function getWalletIcon(connectorName: string) {
  if (connectorName.toLowerCase().includes('metamask')) return WalletIcons.MetaMask;
  if (connectorName.toLowerCase().includes('walletconnect')) return WalletIcons.WalletConnect;
  if (connectorName.toLowerCase().includes('coinbase')) return WalletIcons.Coinbase;
  return WalletIcons.Injected;
}

function getWalletDescription(connectorName: string, isMobile: boolean) {
  if (connectorName.toLowerCase().includes('walletconnect')) {
    return isMobile ? 'Open in mobile wallet' : 'Scan with mobile wallet';
  }
  if (connectorName.toLowerCase().includes('coinbase')) {
    return isMobile ? 'Open Coinbase Wallet' : 'Connect Coinbase Wallet';
  }
  if (connectorName.toLowerCase().includes('metamask')) {
    return isMobile ? 'Open MetaMask app' : 'Connect browser extension';
  }
  return 'Browser wallet';
}

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const { connect, connectors, isPending, error } = useConnect();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  // Sort connectors - WalletConnect first on mobile
  const sortedConnectors = [...connectors].sort((a, b) => {
    const aIsWC = a.name.toLowerCase().includes('walletconnect');
    const bIsWC = b.name.toLowerCase().includes('walletconnect');
    if (isMobile) {
      if (aIsWC && !bIsWC) return -1;
      if (!aIsWC && bIsWC) return 1;
    }
    return 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {isMobile && (
            <p className="text-sm text-gray-500 mb-4 text-center">
              Use WalletConnect to connect your mobile wallet
            </p>
          )}

          <div className="space-y-2">
            {sortedConnectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  connect({ connector });
                }}
                disabled={isPending}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getWalletIcon(connector.name)}
                <div className="flex-1 text-left">
                  <div className="font-medium">{connector.name}</div>
                  <div className="text-sm text-gray-500">
                    {getWalletDescription(connector.name, isMobile)}
                  </div>
                </div>
                {isPending && (
                  <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            By connecting, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}

// Simple connect button that opens the modal
interface ConnectButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function ConnectButton({ className = '', children }: ConnectButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={className || 'px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors'}
      >
        {children || 'Connect Wallet'}
      </button>
      <WalletConnectModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
