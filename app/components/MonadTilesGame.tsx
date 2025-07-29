"use client";

import { useStateTogether, ChatMessage, useConnectedUsers, Cursors } from "react-together";
import { useEffect, useState, useRef } from "react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import NFTMintButton from './NFTMintButton';

const LETTER_PATTERNS = {
    M: [
        [true, false, false, false, false, false, true],
        [true, true, false, false, false, true, true],
        [true, false, true, false, true, false, true],
        [true, false, false, true, false, false, true],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true]
    ],
    O: [
        [false, true, true, true, true, true, false],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true],
        [false, true, true, true, true, true, false]
    ],
    N: [
        [true, false, false, false, false, false, true],
        [true, true, false, false, false, false, true],
        [true, false, true, false, false, false, true],
        [true, false, false, true, false, false, true],
        [true, false, false, false, true, false, true],
        [true, false, false, false, false, true, true],
        [true, false, false, false, false, false, true]
    ],
    A: [
        [false, false, true, true, true, false, false],
        [false, true, false, false, false, true, false],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true],
        [true, true, true, true, true, true, true],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true]
    ],
    D: [
        [true, true, true, true, true, true, false],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true],
        [true, false, false, false, false, false, true],
        [true, true, true, true, true, true, false]
    ]
};

interface TileState {
    [key: string]: boolean;
}

// Types pour les niveaux NFT
export type NFTLevel = 1 | 2 | 3;

export interface NFTReward {
    level: NFTLevel;
    name: string;
    color: string;
    description: string;
}

const TIMER_DURATION = 30; // 30 secondes de timer

// Configuration des récompenses NFT
const NFT_REWARDS: Record<NFTLevel, NFTReward> = {
    3: {
        level: 3,
        name: "Lightning Victory",
        color: "from-yellow-400 to-orange-500",
        description: "Completed with 20-30s remaining - Legendary speed!"
    },
    2: {
        level: 2,
        name: "Swift Victory", 
        color: "from-blue-400 to-purple-500",
        description: "Completed with 10-20s remaining - Great teamwork!"
    },
    1: {
        level: 1,
        name: "Clutch Victory",
        color: "from-green-400 to-teal-500", 
        description: "Completed with 0-10s remaining - Just in time!"
    }
};

// Fonction pour déterminer le niveau NFT basé sur le temps restant
const determineNFTLevel = (timeRemaining: number): NFTLevel => {
    if (timeRemaining >= 20) return 3;
    if (timeRemaining >= 10) return 2;
    return 1;
};

interface CustomCursorProps {
    userId: string;
    pageX: number;
    pageY: number;
    transitionDuration?: number;
    getUserColor?: (userId: string) => string;
}

function CustomUserCursor({ 
    userId, 
    pageX, 
    pageY, 
    transitionDuration = 100,
    getUserColor
}: CustomCursorProps) {
    const connectedUsers = useConnectedUsers();
    const [usernames] = useStateTogether<{ [userId: string]: string }>('usernames', {});
    const [walletAddresses] = useStateTogether<{ [userId: string]: string }>('wallet-addresses', {});
    
    // Fonction pour obtenir le nom d'affichage
    const getDisplayName = (userId: string) => {
        const username = usernames[userId];
        if (username) return username;

        const walletAddr = walletAddresses[userId];
        if (walletAddr) return `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`;

        return `User ${userId.slice(0, 6)}`;
    };

    const color = getUserColor ? getUserColor(userId) : '#3B82F6';
    const displayName = getDisplayName(userId);
    
    return (
        <div
            style={{
                position: 'fixed',
                left: pageX,
                top: pageY,
                pointerEvents: 'none',
                zIndex: 9999,
                transition: `all ${transitionDuration}ms ease-out`,
                transform: 'translate(-2px, -2px)'
            }}
        >
            {/* Curseur en forme de flèche */}
            <div
                style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: color,
                    borderRadius: '50% 0 50% 50%',
                    transform: 'rotate(-45deg)',
                    position: 'relative',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
            />
            
            {/* Nom du joueur */}
            <div
                style={{
                    position: 'absolute',
                    top: '25px',
                    left: '10px',
                    backgroundColor: color,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    border: '1px solid white',
                }}
            >
                {displayName}
            </div>
        </div>
    );
}

export default function MonadTilesGame() {
    // Hooks wallet
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    // Game state avec nouveau timer et niveau NFT
    const [tiles, setTiles] = useStateTogether<TileState>('monad-tiles', {});
    const [gameTimer, setGameTimer] = useStateTogether<number>('game-timer', TIMER_DURATION);
    // ✅ CHANGEMENT CRUCIAL: gameState n'est PLUS synchronisé - chaque joueur gère sa propre popup
    const [gameState, setGameState] = useState<'playing' | 'victory'>('playing');
    const [showVictoryPopup, setShowVictoryPopup] = useState(false);
    const [victoryNFTLevel, setVictoryNFTLevel] = useState<NFTLevel | null>(null);

    // Chat et utilisateurs
    const [chatMessages, setChatMessages] = useStateTogether<ChatMessage[]>('chat-messages', []);
    const [usernames, setUsernames] = useStateTogether<{ [userId: string]: string }>('usernames', {});
    const [walletAddresses, setWalletAddresses] = useStateTogether<{ [userId: string]: string }>('wallet-addresses', {});
    const [currentMessage, setCurrentMessage] = useState('');
    const [tempUsername, setTempUsername] = useState('');
    const [chatOpen, setChatOpen] = useState(false);

    // Ref pour le scroll automatique du chat
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const connectedUsers = useConnectedUsers();
    const myUserId = connectedUsers.find(user => user.isYou)?.userId || 'unknown';

    // Fonction pour obtenir la couleur du curseur par utilisateur
    const getUserColor = (userId: string) => {
        const colors = [
            '#FF6B6B', // Rouge
            '#4ECDC4', // Teal
            '#45B7D1', // Bleu
            '#96CEB4', // Vert
            '#FFEAA7', // Jaune
            '#DDA0DD', // Plum
            '#98D8C8', // Mint
            '#F7DC6F'  // Jaune clair
        ];
        
        // Utiliser l'userId pour assigner une couleur consistante
        const colorIndex = userId.split('').reduce((acc, char) => 
            acc + char.charCodeAt(0), 0
        ) % colors.length;
        
        return colors[colorIndex];
    };

    // Calculs
    const totalTiles = Object.values(LETTER_PATTERNS).reduce((total, pattern) =>
        total + pattern.reduce((rowTotal, row) =>
            rowTotal + row.filter(cell => cell).length, 0), 0
    );

    const activeTiles = Object.values(tiles).filter(Boolean).length;
    const allTilesFlipped = activeTiles === totalTiles;
    const hasUsername = usernames[myUserId];

    // Fonction pour obtenir la couleur de la barre de progression
    const getTimerBarColor = () => {
        if (gameTimer > 20) return 'bg-green-500';
        if (gameTimer > 10) return 'bg-yellow-500';
        if (gameTimer > 5) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const getTimerProgressWidth = () => {
        return (gameTimer / TIMER_DURATION) * 100;
    };

    // Fonction pour scroller vers le bas
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Scroller vers le bas quand les messages changent
    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    // Scroller vers le bas quand le chat s'ouvre
    useEffect(() => {
        if (chatOpen) {
            setTimeout(scrollToBottom, 100);
        }
    }, [chatOpen]);

    // Synchroniser l'adresse wallet avec l'utilisateur
    useEffect(() => {
        if (isConnected && address && myUserId !== 'unknown') {
            setWalletAddresses(prev => ({
                ...prev,
                [myUserId]: address
            }));
        }
    }, [isConnected, address, myUserId, setWalletAddresses]);

    // Timer principal du jeu
    useEffect(() => {
        // ✅ Le timer fonctionne toujours, peu importe l'état local de gameState
        if (gameTimer > 0) {
            const interval = setInterval(() => {
                setGameTimer(prev => {
                    if (prev <= 1) {
                        // Timer fini, reset tout
                        setTiles({});
                        return TIMER_DURATION;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gameTimer, setGameTimer, setTiles]);

    // Vérifier la victoire et déterminer le niveau NFT
    useEffect(() => {
        // ✅ Chaque joueur vérifie individuellement s'il doit voir la popup
        if (allTilesFlipped && !showVictoryPopup) {
            const nftLevel = determineNFTLevel(gameTimer);
            setVictoryNFTLevel(nftLevel);
            setGameState('victory');
            setShowVictoryPopup(true);
            
            // ✅ AUTO-RESTART: Reset automatique des tuiles après 5 secondes
            // Cela permet aux nouveaux joueurs de commencer immédiatement
            setTimeout(() => {
                setTiles({}); // Reset des tuiles partagées
                setGameTimer(TIMER_DURATION); // Reset du timer partagé
                // On ne change pas gameState local - chaque joueur garde sa popup
            }, 5000); // 5 secondes pour voir la victoire
        }
    }, [allTilesFlipped, showVictoryPopup, gameTimer, setTiles, setGameTimer]);

    // Fonction pour obtenir le nom d'affichage
    const getDisplayName = (userId: string) => {
        const username = usernames[userId];
        if (username) return username;

        const walletAddr = walletAddresses[userId];
        if (walletAddr) return `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`;

        return `User ${userId.slice(0, 6)}`;
    };

    // Handlers
    const handleTileClick = (tileKey: string) => {
        // ✅ Les joueurs peuvent cliquer même si leur popup est ouverte
        if (!hasUsername) return;
        
        // Solution temporaire : délai aléatoire pour éviter les conflits multijoueurs
        const delay = Math.random() * 100; // 0-100ms
        
        setTimeout(() => {
            setTiles(prev => ({
                ...prev,
                [tileKey]: !prev[tileKey]
            }));
        }, delay);
    };

    const handleBackgroundClick = () => {
        if (!hasUsername) return;
        // ✅ Reset fonctionne toujours
        setTiles({});
        setGameTimer(TIMER_DURATION);
    };

    const closeVictoryPopup = () => {
        setShowVictoryPopup(false);
        setGameState('playing'); // ✅ Retour en mode jeu pour ce joueur uniquement
    };

    const startNewGame = () => {
        setTiles({});
        setGameTimer(TIMER_DURATION);
        setShowVictoryPopup(false);
        setVictoryNFTLevel(null);
        setGameState('playing'); // ✅ Reset local
    };

    const handleUsernameSubmit = () => {
        if (tempUsername.trim()) {
            setUsernames(prev => ({
                ...prev,
                [myUserId]: tempUsername.trim()
            }));
            setTempUsername('');
        }
    };

   

    // Chat
    const sendMessage = () => {
        if (currentMessage.trim() && hasUsername) {
            const newMessage: ChatMessage = {
                id: Date.now(),
                senderId: myUserId,
                message: currentMessage.trim(),
                sentAt: Date.now()
            };
            setChatMessages(prev => [...prev, newMessage]);
            setCurrentMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    const handleUsernameKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleUsernameSubmit();
        }
    };

    const handleCloseChatClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setChatOpen(false);
    };

    // Obtenir les informations de récompense pour l'affichage
    const getRewardInfo = (level: NFTLevel) => NFT_REWARDS[level];

    return (
        <div className="h-screen flex flex-col bg-background relative">
            {/* Curseurs personnalisés avec le composant Cursors */}
            <Cursors
                components={{
                    UserCursor: CustomUserCursor
                }}
                getUserColor={getUserColor}
                transitionDuration={100}
                throttleDelay={16} 
                omitMyValue={true} 
                deleteOnLeave={true} 
            />

            {/* Header */}
            <nav className="relative z-10 glass bg-[#200052]">
                <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg gradient-primary flex items-center justify-center"></div>
                            <h1 className="text-lg sm:text-xl font-bold text-gradient flex items-center">
                                <img
                                    src="/img/Monad_Together.png"
                                    alt="Monad Together"
                                    className="w-12 h-auto max-h-12 object-contain"
                                />
                                Monad Together
                            </h1>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap">
                            <ConnectedUsersDisplay />

                            

                            {/* Bouton Chat */}
                            {hasUsername && (
                                <button
                                    onClick={() => setChatOpen(!chatOpen)}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-all duration-200 text-sm"
                                >
                                    <span className="hidden sm:inline">Chat</span>
                                    <span className="sm:hidden">💬</span>
                                </button>
                            )}

                            {/* Connect Wallet */}
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
                                                            onClick={openConnectModal}
                                                            type="button"
                                                            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-all duration-200 text-xs sm:text-sm"
                                                        >
                                                            <span className="hidden sm:inline">Connect Wallet</span>
                                                            <span className="sm:hidden">🔗</span>
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        onClick={openAccountModal}
                                                        type="button"
                                                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-all duration-200 text-xs sm:text-sm"
                                                    >
                                                        <span className="hidden sm:inline">{account.displayName}</span>
                                                        <span className="sm:hidden">✅</span>
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    );
                                }}
                            </ConnectButton.Custom>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <div className="flex-1 flex">
                {/* Game area */}
                <div
                    className="flex-1 bg-[#200052] flex flex-col items-center justify-center p-4 cursor-pointer relative"
                    onClick={handleBackgroundClick}
                >
                    {/* Overlay de bienvenue */}
                    {!hasUsername && (
                        <div
                            className="absolute inset-0 bg-[#200052] bg-opacity-50 flex items-center justify-center z-10 p-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-[#836EF9] p-6 sm:p-8 text-center max-w-sm sm:max-w-md mx-4 rounded-lg">
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Welcome to Monad Together!</h2>
                                <p className="text-white mb-6 text-sm sm:text-base">Please enter your username to join the game:</p>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={tempUsername}
                                        onChange={(e) => setTempUsername(e.target.value)}
                                        onKeyPress={handleUsernameKeyPress}
                                        placeholder="Enter your username..."
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-black text-sm sm:text-base"
                                        autoFocus
                                    />

                                    <button
                                        onClick={handleUsernameSubmit}
                                        disabled={!tempUsername.trim()}
                                        className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm sm:text-base disabled:opacity-50"
                                    >
                                        Join Game
                                    </button>
                                </div>

                                
                            </div>
                        </div>
                    )}

                    {/* Stats et Progress */}
                    <div className="mb-4 sm:mb-6 text-center w-full max-w-2xl">
                        <div className="flex gap-4 sm:gap-8 justify-center items-center text-white flex-wrap mb-3">
                            <div className="text-base sm:text-lg">
                                Progress: <span className="font-mono text-purple-300">{activeTiles}/{totalTiles}</span>
                            </div>
                        </div>
                        
                        {/* Barre de progression du timer avec indicateurs NFT */}
                        <div className="w-full max-w-md mx-auto">
                            <div className="bg-gray-700 rounded-full h-6 relative overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${getTimerBarColor()}`}
                                    style={{ width: `${getTimerProgressWidth()}%` }}
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                                    {gameTimer}s
                                </div>
                                
                                {/* Indicateurs de niveaux NFT */}
                                <div className="absolute top-0 left-0 w-full h-full flex items-center">
                                    {/* Ligne à 20s (66.67%) */}
                                    <div className="absolute bg-white w-0.5 h-full" style={{ left: '66.67%' }}>
                                        <div className="absolute -top-6 -left-3 text-xs text-yellow-400"></div>
                                    </div>
                                    {/* Ligne à 10s (33.33%) */}
                                    <div className="absolute bg-white w-0.5 h-full" style={{ left: '33.33%' }}>
                                        <div className="absolute -top-6 -left-3 text-xs text-blue-400"></div>
                                    </div>
                                </div>
                            </div>
                            
                           
                        </div>
                    </div>

                    {/* Grille de jeu */}
                    <div className="flex flex-col 2xl:flex-row gap-4 2xl:gap-12 items-center justify-center px-2 overflow-x-auto">
                        {Object.entries(LETTER_PATTERNS).map(([letter, pattern], letterIndex) => (
                            <div key={letter} className="flex flex-col items-center flex-shrink-0">
                                
                                <div className="flex flex-col gap-0.5 sm:gap-1">
                                    {pattern.map((row, rowIndex) => (
                                        <div key={rowIndex} className="flex gap-0.5 sm:gap-1">
                                            {row.map((isActive, colIndex) => {
                                                const tileKey = `${letter}-${rowIndex}-${colIndex}`;
                                                const isFlipped = tiles[tileKey] || false;

                                                return (
                                                    <div
                                                        key={colIndex}
                                                        className={`w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-sm border-1 transition-all duration-200 relative ${isActive
                                                            ? `cursor-pointer border-[#200052] [perspective:1000px] touch-manipulation`
                                                            : 'border-transparent bg-transparent'}`}
                                                        onClick={isActive ? (e) => {
                                                            e.stopPropagation();
                                                            handleTileClick(tileKey);
                                                        } : undefined}
                                                    >
                                                        {isActive && (
                                                            <div
                                                                className={`w-full h-full rounded-sm transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                                                            >
                                                                <div className="absolute inset-0 rounded-sm bg-white hover:bg-gray-100 border-2 border-purple-400 [backface-visibility:hidden]" />
                                                                <div className="absolute inset-0 rounded-sm bg-[#836EF9] border-2 border-purple-400 [backface-visibility:hidden] [transform:rotateY(180deg)]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Instructions */}
                    <div className="mt-6 sm:mt-8 text-center text-white max-w-2xl px-4">
                        <p className="mb-2 text-lg sm:text-base">
                            Work together to flip all MONAD tiles purple before the timer runs out!
                        </p>
                        <p className="mb-2 text-lg sm:text-base text-white">
                            Timer resets when it hits zero. Clicking outside resets tiles and timer.
                        </p>
                        <p className="mb-2 text-lg sm:text-base text-white">
                            You need teamwork - impossible to do alone in {TIMER_DURATION} seconds!
                        </p>
                        <p className="mb-2 text-sm text-purple-300">
                            <strong>Faster completion = Better NFT rewards!</strong>
                        </p>
                    </div>

                    {/* Popup de victoire avec niveau NFT */}
                    {showVictoryPopup && victoryNFTLevel && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div
                                className="bg-[#836EF9] rounded-lg p-6 sm:p-8 text-center max-w-sm sm:max-w-md mx-4 w-full"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {(() => {
                                    const reward = getRewardInfo(victoryNFTLevel);
                                    return (
                                        <>
                                            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                                                🎉 VICTORY! 🎉
                                            </h2>
                                            
                                            {/* Affichage du niveau NFT avec animation */}
                                            <div className={`bg-gradient-to-r ${reward.color} rounded-lg p-4 mb-4 transform animate-pulse`}>
                                                
                                                <div className="text-xl font-bold text-white">{reward.name}</div>
                                                <div className="text-sm text-white opacity-90">{reward.description}</div>
                                                <div className="mt-2">
                                                    <div className="flex justify-center gap-1">
                                                        {Array.from({ length: 3 }).map((_, i) => (
                                                            <span 
                                                                key={i} 
                                                                className={`text-xl ${i < victoryNFTLevel ? 'text-yellow-300' : 'text-gray-400'}`}
                                                            >
                                                                ⭐
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-white mb-6 text-sm sm:text-base">
                                                Amazing teamwork! You completed the challenge !
                                                
                                            </p>

                                            <div
                                                className="space-y-4 mb-6"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <NFTMintButton
                                                    nftLevel={victoryNFTLevel}
                                                    onMintSuccess={(txHash) => {
                                                        console.log('NFT minted!', txHash);
                                                    }}
                                                    onMintError={(error) => {
                                                        console.error('Mint failed:', error);
                                                    }}
                                                />
                                            </div>

                                            <div className="flex gap-2 sm:gap-4 justify-center flex-wrap">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        closeVictoryPopup();
                                                    }}
                                                    className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm sm:text-base"
                                                >
                                                    Continue Playing
                                                </button>
                                                
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat sidebar */}
                {chatOpen && hasUsername && (
                    <div
                        className="fixed top-0 right-0 h-full w-full sm:w-80 md:w-96 bg-gray-800 border-l border-gray-700 flex flex-col z-50 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handleCloseChatClick}
                            className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold focus:outline-none z-10"
                        >
                            ×
                        </button>
                        <div className="p-3 sm:p-4 border-b border-gray-700 relative">
                            <h3 className="text-white font-semibold text-sm sm:text-base">Chat</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
                            {chatMessages.map((msg) => {
                                const isMyMessage = msg.senderId === myUserId;
                                const senderName = getDisplayName(msg.senderId);

                                return (
                                    <div key={msg.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs sm:max-w-sm lg:max-w-md px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${isMyMessage
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-700 text-white'
                                            }`}>
                                            {!isMyMessage && (
                                                <div className="text-blue-400 font-medium text-xs mb-1">
                                                    {senderName}
                                                </div>
                                            )}
                                            <div className="break-words">
                                                {msg.message}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {chatMessages.length === 0 && (
                                <div className="text-gray-500 text-xs sm:text-sm italic text-center">
                                    Coordinate with your team! Communication is key to victory.
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 sm:p-4 border-t border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={currentMessage}
                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Coordinate your strategy..."
                                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={sendMessage}
                                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors text-xs sm:text-sm"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <footer className="w-full px-4 bg-[#200052] sm:px-6 lg:px-8 py-2">
                <div className="max-w-7xl mx-auto text-center">
                    <nav className="text-gray-400 text-sm">
                        <ul className="flex items-center justify-center gap-4">
                            <li>
                                Made by <a href="https://x.com/sifu_lam" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">Sifu_lam</a> for
                            </li>
                            <li>
                                <img src="/img/logomonad.png" alt="monad" className="h-3 w-auto" />
                            </li>
                        </ul>
                    </nav>
                </div>
            </footer>
        </div>
    );
}

function ConnectedUsersDisplay() {
    const connectedUsers = useConnectedUsers();

    if (!connectedUsers || connectedUsers.length === 0) return null;

    return (
        <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm text-white">
                    <span className="hidden sm:inline">{connectedUsers.length} player{connectedUsers.length !== 1 ? "s" : ""} online</span>
                    <span className="sm:hidden">{connectedUsers.length}</span>
                </span>
            </div>
        </div>
    );
}