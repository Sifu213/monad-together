"use client";

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Import du contrat avec la vraie adresse et ABI
const CONTRACT_ADDRESS = "0x98b09019c91cd15f4ddc6e5f2d13426f66fcb728";

// Types pour les niveaux NFT
export type NFTLevel = 1 | 2 | 3;

export interface NFTReward {
    level: NFTLevel;
    name: string;
    emoji: string;
    color: string;
    description: string;
}

// Configuration des récompenses NFT
const NFT_REWARDS: Record<NFTLevel, NFTReward> = {
    3: {
        level: 3,
        name: "Lightning Victory",
        emoji: "⚡",
        color: "from-yellow-400 to-orange-500",
        description: "Completed with 20-30s remaining - Legendary speed!"
    },
    2: {
        level: 2,
        name: "Swift Victory", 
        emoji: "🚀",
        color: "from-blue-400 to-purple-500",
        description: "Completed with 10-20s remaining - Great teamwork!"
    },
    1: {
        level: 1,
        name: "Clutch Victory",
        emoji: "🎯",
        color: "from-green-400 to-teal-500", 
        description: "Completed with 0-10s remaining - Just in time!"
    }
};

// ABI simplifiée avec seulement les fonctions nécessaires
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "level",
        "type": "uint8"
      }
    ],
    "name": "mintVictoryNFT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "mintLightningVictoryNFT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "mintSwiftVictoryNFT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "mintClutchVictoryNFT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

interface NFTMintButtonProps {
  nftLevel: NFTLevel;
  onMintSuccess?: (txHash: string) => void;
  onMintError?: (error: string) => void;
}

export default function NFTMintButton({ nftLevel, onMintSuccess, onMintError }: NFTMintButtonProps) {
  const { address, isConnected } = useAccount();
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);

  console.log('NFTMintButton - isConnected:', isConnected, 'address:', address, 'nftLevel:', nftLevel);

  const { 
    writeContract, 
    data: hash, 
    error: writeError,
    isPending: isWritePending
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Obtenir les informations de récompense pour le niveau donné
  const rewardInfo = NFT_REWARDS[nftLevel];

  const handleMint = async () => {
    if (!isConnected || !address) {
      onMintError?.('Please connect your wallet first');
      return;
    }

    try {
      setIsMinting(true);
      
      // Utiliser la fonction principale mintVictoryNFT avec le paramètre niveau
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'mintVictoryNFT',
        args: [address, nftLevel],
      });
      
    } catch (error: unknown) {
      console.error('Mint error:', error);
      setIsMinting(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';
      onMintError?.(errorMessage);
    }
  };

  // Gérer le succès de la transaction
  if (isConfirmed && hash && !mintSuccess) {
    setMintSuccess(true);
    setIsMinting(false);
    onMintSuccess?.(hash);
  }

  // Gérer les erreurs
  if ((writeError || confirmError) && isMinting) {
    setIsMinting(false);
    const errorMessage = writeError?.message || confirmError?.message || 'Transaction failed';
    onMintError?.(errorMessage);
  }

  if (mintSuccess) {
    return (
      <div className="text-center space-y-3">
        
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

  if (isMinting || isWritePending || isConfirming) {
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
        disabled={isMinting || isWritePending}
        className={`px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        Mint {rewardInfo.name} NFT (Free)
      </button>
    </div>
  );
}