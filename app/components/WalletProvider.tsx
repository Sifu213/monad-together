"use client";

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  midnightTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { defineChain } from 'viem';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

// Définition de la chaîne Monad Testnet
export const monadTestnet = defineChain({
  id: 10143, 
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://monad-testnet.g.alchemy.com/v2/N8FOvudhyXRlr3yAQzoFY'], 
    },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://testnet.monadscan.xyz' },
  },
});

const config = getDefaultConfig({
  appName: 'Monad Together',
  projectId: '3afda50686b39a0edbb0a266b169d453', // Votre Project ID existant
  chains: [monadTestnet],
  ssr: false,
});

const queryClient = new QueryClient();

interface WalletProviderProps {
  children: React.ReactNode;
}

export default function WalletProvider({ children }: WalletProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={midnightTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}