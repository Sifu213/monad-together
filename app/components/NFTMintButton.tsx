"use client";

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract'

interface NFTMintButtonProps {
  onMintSuccess?: (txHash: string) => void;
  onMintError?: (error: string) => void;
}


export default function NFTMintButton({ onMintSuccess, onMintError }: NFTMintButtonProps) {
  const { address, isConnected } = useAccount();
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);

  console.log('NFTMintButton - isConnected:', isConnected, 'address:', address); // Debug

  const { 
    writeContract, 
    data: hash, 
    error: writeError 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  const handleMint = async () => {
    if (!isConnected || !address) {
      onMintError?.('Please connect your wallet first');
      return;
    }

    try {
      setIsMinting(true);
      
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'mintVictoryNFT',
        args: [address],
      });
      
    } catch (error: unknown) {
      console.error('Mint error:', error);
      setIsMinting(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';
      onMintError?.(errorMessage);
    }
  };


  if (isConfirmed && hash && !mintSuccess) {
    setMintSuccess(true);
    setIsMinting(false);
    onMintSuccess?.(hash);
  }

  if ((writeError || confirmError) && isMinting) {
    setIsMinting(false);
    const errorMessage = writeError?.message || confirmError?.message || 'Transaction failed';
    onMintError?.(errorMessage);
  }

  if (mintSuccess) {
    return (
      <div className="text-center space-y-3">
        <div className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold">
          NFT Minted Successfully!
        </div>
        {hash && (
          <a
            href={`https://monad-testnet.socialscan.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-600 hover:text-purple-700 underline"
          >
            View on Monad Explorer
          </a>
        )}
      </div>
    );
  }

  if (isMinting || isConfirming) {
    return (
      <div className="flex justify-center text-center space-y-3">
     
      <button
        disabled
        className="px-6 py-3 bg-purple-400 text-white rounded-lg cursor-not-allowed font-semibold flex items-center justify-center gap-2"
      >
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        {isConfirming ? 'Confirming...' : 'Minting...'}
      </button>
      </div>
    );
  }


  if (!isConnected) {
    return (
      <div className="text-center space-y-3">
        <div className="text-white mb-3">
          Connect your wallet to mint your Victory NFT!
        </div>
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  'style': {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openConnectModal();
                        }}
                        type="button"
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-all duration-200"
                      >
                        Connect Wallet to Mint
                      </button>
                    );
                  }

                  return (
                    <div className="text-center space-y-2">
                      <div className="text-sm text-gray-600">
                        Wallet connected successfully!
                      </div>
                      <div className="text-xs text-gray-500">
                        {account.displayName} on {chain.name}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    );
  }

  return (
    <div className="text-center space-y-3">
      <div className="text-sm text-white">
        Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleMint();
        }}
        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-all duration-200"
      >
        Mint Victory NFT (Free)
      </button>
    </div>
  );
}