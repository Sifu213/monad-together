"use client";

import { useStateTogether, ChatMessage, useConnectedUsers, useCursors } from "react-together";
import { useEffect, useState } from "react";

// Définition des patterns pour chaque lettre (format 7x7, ~124 tuiles total)
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
    [key: string]: boolean; // key format: "letter-row-col"
}

export default function MonadTilesGame() {
    const [tiles, setTiles] = useStateTogether<TileState>('monad-tiles', {});
    const [gameState, setGameState] = useStateTogether<'playing' | 'victory-timer' | 'won'>('game-state', 'playing');
    const [victoryTimer, setVictoryTimer] = useStateTogether<number>('victory-timer', 60);
    const [showVictoryPopup, setShowVictoryPopup] = useState(false);

    // Chat et utilisateurs
    const [chatMessages, setChatMessages] = useStateTogether<ChatMessage[]>('chat-messages', []);
    const [usernames, setUsernames] = useStateTogether<{ [userId: string]: string }>('usernames', {});
    const [currentMessage, setCurrentMessage] = useState('');
    const [tempUsername, setTempUsername] = useState('');
    const [chatOpen, setChatOpen] = useState(false);

    const connectedUsers = useConnectedUsers();
    const { myCursor, allCursors } = useCursors({ deleteOnLeave: true });

    // Utiliser l'ID du système react-together
    const myUserId = connectedUsers.find(user => user.isYou)?.userId || 'unknown';

    // Debug: vérifier les usernames
    console.log('Current usernames:', usernames);
    console.log('My userId from connectedUsers:', myUserId);
    console.log('My username:', usernames[myUserId]);
    console.log('ConnectedUsers:', connectedUsers);

    // Calculer le nombre total de tuiles et les tuiles actives
    const totalTiles = Object.values(LETTER_PATTERNS).reduce((total, pattern) =>
        total + pattern.reduce((rowTotal, row) =>
            rowTotal + row.filter(cell => cell).length, 0), 0
    );

    const activeTiles = Object.values(tiles).filter(Boolean).length;

    // Vérifier si toutes les tuiles sont retournées
    const allTilesFlipped = activeTiles === totalTiles;

    // Vérifier si l'utilisateur a un pseudo
    const hasUsername = usernames[myUserId];

    // Gérer le timer de victoire
    useEffect(() => {
        if (allTilesFlipped && gameState === 'playing') {
            setGameState('victory-timer');
            setVictoryTimer(60);
        } else if (!allTilesFlipped && gameState === 'victory-timer') {
            setGameState('playing');
        }
    }, [allTilesFlipped, gameState]);

    // Countdown timer
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

    // Gérer le clic sur une tuile
    const handleTileClick = (tileKey: string) => {
        if (!hasUsername) return;
        setTiles(prev => ({
            ...prev,
            [tileKey]: !prev[tileKey]
        }));
    };

    // Gérer le clic sur l'arrière-plan (reset)
    const handleBackgroundClick = () => {
        if (!hasUsername) return;
        setTiles({});
        setGameState('playing');
        setVictoryTimer(60);
        setShowVictoryPopup(false);
    };

    // Fermer la popup de victoire
    const closeVictoryPopup = () => {
        setShowVictoryPopup(false);
    };

    // Nouveau jeu
    const startNewGame = () => {
        setTiles({});
        setGameState('playing');
        setVictoryTimer(60);
        setShowVictoryPopup(false);
    };

    // Gestion du pseudo
    const handleUsernameSubmit = () => {
        if (tempUsername.trim()) {
            setUsernames(prev => ({
                ...prev,
                [myUserId]: tempUsername.trim()
            }));
            setTempUsername('');
        }
    };

    // Gestion du chat
    const sendMessage = () => {
        if (currentMessage.trim() && usernames[myUserId]) {
            const newMessage: ChatMessage = {
                id: Date.now(),
                senderId: usernames[myUserId],
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

    // Fermer le chat avec gestion de la propagation
    const handleCloseChatClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setChatOpen(false);
    };

    return (
        <div className="h-screen flex flex-col bg-background relative">
            {/* Curseurs des autres joueurs */}
            {Object.entries(allCursors).map(([cursorUserId, cursor]) => {
                if (!cursor) return null;
                
                // Debug: vérifier l'userId du curseur
                console.log('Cursor userId:', cursorUserId, 'Username:', usernames[cursorUserId]);
                
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
                        {/* Curseur principal */}
                        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                        
                        {/* Nom du joueur - toujours affiché */}
                        <div className="absolute top-6 left-2 px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded shadow-lg whitespace-nowrap">
                            {usernames[cursorUserId] || `User ${cursorUserId.slice(0, 6)}`}
                        </div>
                        
                        {/* Debug info */}
                        <div className="absolute top-12 left-2 px-1 py-0.5 text-xs text-black bg-yellow-200 rounded">
                            Raw: {cursorUserId.slice(0, 4)} | Name: {usernames[cursorUserId] || 'NONE'}
                        </div>
                    </div>
                );
            })}

            {/* Header */}
            <nav className="relative z-10 glass bg-[#200052]">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center"></div>
                            <div>
                                <h1 className="text-xl font-bold text-gradient">
                                    Monad Together
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <ConnectedUsersDisplay />
                            {!hasUsername ? (
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={tempUsername}
                                        onChange={(e) => setTempUsername(e.target.value)}
                                        onKeyPress={handleUsernameKeyPress}
                                        placeholder="Enter your username..."
                                        className="px-3 py-1 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                    />
                                    <button
                                        onClick={handleUsernameSubmit}
                                        disabled={!tempUsername.trim()}
                                        className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                                    >
                                        Join
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setChatOpen(!chatOpen)}
                                        className="relative px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
                                    >
                                        Chat {chatMessages.length > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                                                {chatMessages.length}
                                            </span>
                                        )}
                                    </button>
                                </>
                            )}
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
                    {/* Header avec stats */}
                    <div className="mb-2 text-center">
                        <div className="flex gap-8 justify-center items-center text-white">
                            <div className="text-lg">
                                Progress: <span className="font-mono text-purple-300">{activeTiles}/{totalTiles}</span>
                            </div>
                            {gameState === 'victory-timer' && (
                                <div className="text-lg text-yellow-400 animate-pulse">
                                    Victory in: <span className="font-mono text-2xl">{victoryTimer}s</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grille de jeu */}
                    <div
                        className="flex gap-12 items-center justify-center"
                    >
                        {Object.entries(LETTER_PATTERNS).map(([letter, pattern], letterIndex) => (
                            <div key={letter} className="flex flex-col gap-1">
                                {pattern.map((row, rowIndex) => (
                                    <div key={rowIndex} className="flex gap-1">
                                        {row.map((isActive, colIndex) => {
                                            const tileKey = `${letter}-${rowIndex}-${colIndex}`;
                                            const isFlipped = tiles[tileKey] || false;

                                            return (
                                                <div
                                                    key={colIndex}
                                                    className={`w-8 h-8 rounded-sm border-1 transition-all duration-200 relative ${isActive
                                                        ? `cursor-pointer border-[#200052] [perspective:1000px]`
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
                                                            {/* Face avant (blanche) */}
                                                            <div className="absolute inset-0 rounded-sm bg-white hover:bg-gray-100 border-2 border-purple-400 [backface-visibility:hidden]" />
                                                            
                                                            {/* Face arrière (violette) */}
                                                            <div className="absolute inset-0 rounded-sm bg-[#836EF9] border-2 border-purple-400 [backface-visibility:hidden] [transform:rotateY(180deg)]" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Instructions */}
                    <div className="mt-8 text-center text-gray-300 max-w-2xl">
                        <p className="mb-2">Click on tiles to flip them purple. Get all tiles purple and keep them that way for 60 seconds!</p>
                        <p className="text-sm text-red-300">If a player click anywhere else, all the tiles will reset!</p>
                    </div>

                    {/* Popup de victoire */}
                    {showVictoryPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
                                <h2 className="text-3xl font-bold text-purple-600 mb-4">🎉 VICTORY! 🎉</h2>
                                <p className="text-gray-700 mb-6">
                                    Congratulations! You successfully flipped all tiles and maintained them for 60 seconds!
                                </p>
                                <div className="flex gap-4 justify-center">
                                    <button
                                        onClick={startNewGame}
                                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        New Game
                                    </button>
                                    <button
                                        onClick={closeVictoryPopup}
                                        className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat sidebar (overlay) */}
                {chatOpen && hasUsername && (
                    <div 
                        className="fixed top-0 right-0 h-full w-80 bg-gray-800 border-l border-gray-700 flex flex-col z-50 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={handleCloseChatClick}
                            className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold focus:outline-none z-10"
                            aria-label="Close chat"
                        >
                            ×
                        </button>
                        {/* Chat header */}
                        <div className="p-4 border-b border-gray-700 relative">
                            <h3 className="text-white font-semibold">Chat</h3>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {chatMessages.map((msg) => (
                                <div key={msg.id} className="text-sm">
                                    <span className="text-blue-400 font-medium">{msg.senderId}:</span>
                                    <span className="text-gray-300 ml-2">{msg.message}</span>
                                </div>
                            ))}
                            {chatMessages.length === 0 && (
                                <div className="text-gray-500 text-sm italic">No messages yet. Start the conversation!</div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={currentMessage}
                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type a message..."
                                    className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={sendMessage}
                                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
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
        <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-text-muted">
                    {connectedUsers.length} {connectedUsers.length !== 1 ? "s" : ""}{" "}
                    online
                </span>
            </div>
        </div>
    );
}