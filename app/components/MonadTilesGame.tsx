"use client";

import { useStateTogether, ChatMessage, useConnectedUsers, useCursors } from "react-together";
import { useEffect, useState, useRef } from "react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import NFTMintButton from './NFTMintButton';

// ... (gardez tous vos LETTER_PATTERNS et interfaces existants)
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

export default function MonadTilesGame() {
    // Hooks wallet
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    // Vos hooks existants
    const [tiles, setTiles] = useStateTogether<TileState>('monad-tiles', {});
    const [gameState, setGameState] = useStateTogether<'playing' | 'victory-timer' | 'won'>('game-state', 'playing');
    const [victoryTimer, setVictoryTimer] = useStateTogether<number>('victory-timer', 60);
    const [showVictoryPopup, setShowVictoryPopup] = useState(false);

    // Chat et utilisateurs (avec wallet integration)
    const [chatMessages, setChatMessages] = useStateTogether<ChatMessage[]>('chat-messages', []);
    const [usernames, setUsernames] = useStateTogether<{ [userId: string]: string }>('usernames', {});
    const [walletAddresses, setWalletAddresses] = useStateTogether<{ [userId: string]: string }>('wallet-addresses', {});
    const [currentMessage, setCurrentMessage] = useState('');
    const [tempUsername, setTempUsername] = useState('');
    const [chatOpen, setChatOpen] = useState(false);

    // Ref pour le scroll automatique du chat
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const connectedUsers = useConnectedUsers();
    const { myCursor, allCursors } = useCursors({
        deleteOnLeave: true,
        throttleDelay: 50,
        omitMyValue: true // Exclure mon propre curseur
    });

    const myUserId = connectedUsers.find(user => user.isYou)?.userId || 'unknown';

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
            // Délai pour laisser le temps au chat de s'afficher
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

    // Vos calculs existants
    const totalTiles = Object.values(LETTER_PATTERNS).reduce((total, pattern) =>
        total + pattern.reduce((rowTotal, row) =>
            rowTotal + row.filter(cell => cell).length, 0), 0
    );

    const activeTiles = Object.values(tiles).filter(Boolean).length;
    const allTilesFlipped = activeTiles === totalTiles;
    const hasUsername = usernames[myUserId];

    // Fonction pour obtenir le nom d'affichage (pseudo ou adresse)
    const getDisplayName = (userId: string) => {
        const username = usernames[userId];
        if (username) return username;

        const walletAddr = walletAddresses[userId];
        if (walletAddr) return `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`;

        return `User ${userId.slice(0, 6)}`;
    };

    // Vos useEffects existants pour le timer...
    useEffect(() => {
        if (allTilesFlipped && gameState === 'playing') {
            setGameState('victory-timer');
            setVictoryTimer(60);
        } else if (!allTilesFlipped && gameState === 'victory-timer') {
            setGameState('playing');
        }
    }, [allTilesFlipped, gameState]);

    useEffect(() => {
        if (gameState === 'victory-timer' && victoryTimer > 0) {
            const interval = setInterval(() => {
                setVictoryTimer(prev => {
                    if (prev <= 1) {
                        setGameState('won');
                        setShowVictoryPopup(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gameState, victoryTimer]);

    // Handlers - seulement pseudo obligatoire
    const handleTileClick = (tileKey: string) => {
        if (!hasUsername) return;
        setTiles(prev => ({
            ...prev,
            [tileKey]: !prev[tileKey]
        }));
    };

    const handleBackgroundClick = () => {
        if (!hasUsername) return;
        setTiles({});
        setGameState('playing');
        setVictoryTimer(60);
        setShowVictoryPopup(false);
    };

    const closeVictoryPopup = () => {
        setShowVictoryPopup(false);
    };

    const startNewGame = () => {
        setTiles({});
        setGameState('playing');
        setVictoryTimer(60);
        setShowVictoryPopup(false);
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

    // Chat avec identification correcte
    const sendMessage = () => {
        if (currentMessage.trim() && hasUsername) {
            const newMessage: ChatMessage = {
                id: Date.now(),
                senderId: myUserId, // Stocke l'userId pour l'identification
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

    return (
        <div className="h-screen flex flex-col bg-background relative"> 
            {Object.entries(allCursors).map(([cursorUserId, cursor]) => {
                if (!cursor || cursorUserId === myUserId) return null; 

                return (
                    <div
                        key={cursorUserId}
                        className="fixed pointer-events-none z-40"
                        style={{
                            left: cursor.clientX,
                            top: cursor.clientY,
                            transform: 'translate(-50%, -50%)',
                            transition: 'all 0.1s linear',
                        }}
                    >
                        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                        <div className="absolute top-6 left-2 px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded shadow-lg whitespace-nowrap">
                            {getDisplayName(cursorUserId)}
                        </div>

                    </div>
                );
            })}

            {/* Header */}
            <nav className="relative z-10 glass bg-[#200052]">
                <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg gradient-primary flex items-center justify-center"></div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-gradient">
                                    Monad Together
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap">
                            <ConnectedUsersDisplay />

                            {/* Bouton Chat (seulement si pseudo défini) */}
                            {hasUsername && (
                                <button
                                    onClick={() => setChatOpen(!chatOpen)}
                                    className="relative px-3 sm:px-6 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors text-sm"
                                >
                                    <span className="hidden sm:inline">Chat</span>
                                    <span className="sm:hidden">💬</span>
                                    {chatMessages.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                                            {chatMessages.length}
                                        </span>
                                    )}
                                </button>
                            )}

                            {/* Bouton temporaire pour tester la popup de victoire */}
                            {hasUsername && (
                                <button
                                    onClick={() => setShowVictoryPopup(true)}
                                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium transition-colors text-xs sm:text-sm"
                                >
                                    <span className="hidden sm:inline">🧪 Test Victory</span>
                                    <span className="sm:hidden">🧪</span>
                                </button>
                            )}
                       
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
                                                            className="px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors text-xs sm:text-sm"
                                                        >
                                                            <span className="hidden sm:inline">Connect Wallet</span>
                                                            <span className="sm:hidden">🔗</span>
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                                        <button
                                                            onClick={openChainModal}
                                                            style={{ display: 'flex', alignItems: 'center' }}
                                                            type="button"
                                                            className="px-2 sm:px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs sm:text-sm"
                                                        >
                                                            {chain.hasIcon && (
                                                                <div
                                                                    style={{
                                                                        background: chain.iconBackground,
                                                                        width: 16,
                                                                        height: 16,
                                                                        borderRadius: 999,
                                                                        overflow: 'hidden',
                                                                        marginRight: 6,
                                                                    }}
                                                                >
                                                                    {chain.iconUrl && (
                                                                        <img
                                                                            alt={chain.name ?? 'Chain icon'}
                                                                            src={chain.iconUrl}
                                                                            style={{ width: 16, height: 16 }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                            <span className="hidden sm:inline">{chain.name}</span>
                                                        </button>

                                                        <button
                                                            onClick={openAccountModal}
                                                            type="button"
                                                            className="px-2 sm:px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm"
                                                        >
                                                            <span className="hidden sm:inline">{account.displayName}</span>
                                                            <span className="sm:hidden">✅</span>
                                                        </button>
                                                    </div>
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
                    className="flex-1 bg-[#200052] flex flex-col items-center justify-center p-4 cursor-pointer"
                    onClick={handleBackgroundClick}
                >
                    {/* Overlay de bienvenue avec saisie du pseudo */}
                    {!hasUsername && (
                        <div
                            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 p-4"
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
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-white text-sm sm:text-base"
                                        autoFocus
                                    />

                                    <button
                                        onClick={handleUsernameSubmit}
                                        disabled={!tempUsername.trim()}
                                        className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm sm:text-base"
                                        
                                    >
                                        Join Game
                                    </button>
                                </div>

                                <p className="text-xs sm:text-sm text-white mt-4">
                                    You can play without connecting a wallet<br />
                                    Connect your wallet needed to mint victory NFT!
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Header avec stats */}
                    <div className="mb-4 sm:mb-2 text-center">
                        <div className="flex gap-4 sm:gap-8 justify-center items-center text-white flex-wrap">
                            <div className="text-base sm:text-lg">
                                Progress: <span className="font-mono text-purple-300">{activeTiles}/{totalTiles}</span>
                            </div>
                            {gameState === 'victory-timer' && (
                                <div className="text-base sm:text-lg text-yellow-400 animate-pulse">
                                    Victory in: <span className="font-mono text-xl sm:text-2xl">{victoryTimer}s</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grille de jeu */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 lg:gap-12 items-center justify-center px-2 overflow-x-auto">
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
                    <div className="mt-6 sm:mt-8 text-center text-gray-300 max-w-2xl px-4">
                        <p className="mb-2 text-sm sm:text-base">Click on tiles to flip them purple. Get all tiles purple and keep them that way for 60 seconds!</p>
                        <p className="text-xs sm:text-sm text-red-300">If a player click anywhere else, all the tiles will reset!</p>
                    </div>

                    {/* Popup de victoire */}
                    {showVictoryPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div 
                                className="bg-[#836EF9] rounded-lg p-6 sm:p-8 text-center max-w-sm sm:max-w-md mx-4 w-full"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2 className="text-2xl sm:text-3xl font-bold text-white-600 mb-4">VICTORY!</h2>
                                <p className="text-white mb-6 text-sm sm:text-base">
                                    Congratulations! You successfully flipped all tiles and maintained them for 60 seconds!
                                </p>

                                <div 
                                    className="space-y-4 mb-6"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <NFTMintButton
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
                                            startNewGame();
                                        }}
                                        className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm sm:text-base"
                                    >
                                        New Game
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            closeVictoryPopup();
                                        }}
                                        className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat sidebar avec bulles */}
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

                        {/* Messages avec bulles et auto-scroll */}
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
                                <div className="text-gray-500 text-xs sm:text-sm italic text-center">No messages yet. Start the conversation!</div>
                            )}
                            {/* Élément invisible pour le scroll automatique */}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 sm:p-4 border-t border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={currentMessage}
                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type a message..."
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

            <footer className="w-full px-4 bg-[#200052] sm:px-6 lg:px-8 py-0">
                <div className="max-w-7xl mx-auto text-center">
                    <nav className="text-gray-400 text-sm">
                        <ul className="flex items-center justify-center gap-4">
                            <li>
                                Made by <a href="https://x.com/sifu_lam" target="_blank" rel="noopener noreferrer">Sifu_lam</a> for
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
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs sm:text-sm text-text-muted">
                    <span className="hidden sm:inline">{connectedUsers.length} {connectedUsers.length !== 1 ? "s" : ""} online</span>
                    <span className="sm:hidden">{connectedUsers.length}</span>
                </span>
            </div>
        </div>
    );
}