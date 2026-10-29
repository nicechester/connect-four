import * as Game from './game.js';
import * as UI from './ui.js';
import * as Network from './network.js';
import { playDropSound } from './sound.js';

let board = Game.createEmptyBoard();
let currentPlayer = 'red';
let gameOver = false;
let gameMode = 'pvp';
let aiDifficulty = 'medium';
let aiThinking = false;
let aiThinkingInterval = null;
let player1Name = 'Player 1';
let player2Name = 'Player 2';
let player1Score = 0;
let player2Score = 0;
let peer = null;
let conn = null;
let isHost = false;


const boardElement = document.getElementById('game-board');
const statusElement = document.getElementById('status');
const scoreElement = document.getElementById('score');
const difficultyContainer = document.getElementById('ai-difficulty-container');
const pvpNamesContainer = document.getElementById('pvp-names');
const pveNamesContainer = document.getElementById('pve-names');
const mainMenuElement = document.getElementById('main-menu');
const gameScreenElement = document.getElementById('game-screen');
const resultModalElement = document.getElementById('result-modal');
const resultModalContent = resultModalElement.querySelector('.modal-content');
const resultMessageElement = document.getElementById('result-message');

// --- Game Logic ---

export function setGameMode(mode) {
    gameMode = mode;
    difficultyContainer.style.display = mode === 'pve' ? 'inline-block' : 'none';
    pvpNamesContainer.style.display = mode === 'pvp' ? 'block' : 'none';
    pveNamesContainer.style.display = mode === 'pve' ? 'block' : 'none';
    document.getElementById('network-names').style.display = mode === 'network' ? 'block' : 'none';
    document.getElementById('start-game-btn').style.display = mode === 'network' ? 'none' : 'block';
}

export function setDifficulty() {
    aiDifficulty = document.getElementById('ai-difficulty').value;
}

export function savePlayerNames() {
    if (gameMode === 'pvp') {
        player1Name = document.getElementById('player1-name').value;
        player2Name = document.getElementById('player2-name').value;
    } else {
        player1Name = document.getElementById('player-single-name').value;
        player2Name = 'AI';
    }
    player1Score = 0;
    player2Score = 0;
    updateScoreDisplay();
}

export function startGame() {
    savePlayerNames();
    mainMenuElement.classList.remove('active');
    gameScreenElement.classList.add('active');
    resetGame();
}

export function resetGame(isRemote = false) {
    if (!isRemote && conn && conn.open) {
        conn.send({ type: 'RESET' });
    }
    board = Game.createEmptyBoard();
    currentPlayer = 'red';
    gameOver = false;
    UI.createBoardUI(boardElement, Game.rows, Game.cols, handleMove);
    updateStatusText();
    resultModalElement.classList.remove('active');
}

export function returnToMain() {
    gameScreenElement.classList.remove('active');
    mainMenuElement.classList.add('active');
}

export function returnToMainFromModal() {
    resultModalElement.classList.remove('active');
    returnToMain();
}

export function playAgain(isRemote = false) {
    if (!isRemote && conn && conn.open) {
        conn.send({ type: 'PLAY_AGAIN' });
    }
    resetGame();
}

// --- Move Handling ---

function handleMove(col, isRemote = false) {
    if (!isRemote && ((isHost && currentPlayer !== 'red') || (!isHost && currentPlayer !== 'yellow'))) return;
    if (gameOver || aiThinking) return;
    const r = Game.getAvailableRow(board, col);
    if (r === -1) return;

    board[r][col] = currentPlayer;
    UI.updateBoardUI(board, r, col);
    playDropSound();
    if (!isRemote && conn && conn.open) {
        conn.send({ type: 'MOVE', col: col });
    }

    if (Game.checkWinBoard(board, r, col, currentPlayer)) {
        if (currentPlayer === 'red') {
            player1Score++;
        } else {
            player2Score++;
        }
        updateScoreDisplay();
        const winnerName = currentPlayer === 'red' ? player1Name : player2Name;
        UI.updateStatusText(statusElement, `${winnerName} Wins!`);
        gameOver = true;
        UI.showResultModal(resultModalElement, resultMessageElement, resultModalContent, `${winnerName} Wins!`);
        return;
    }

    if (Game.isBoardFull(board)) {
        UI.updateStatusText(statusElement, "It's a Draw!");
        gameOver = true;
        UI.showResultModal(resultModalElement, resultMessageElement, resultModalContent, "It's a Draw!");
        return;
    }

    currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
    
    if (gameMode === 'pve' && currentPlayer === 'yellow' && !gameOver) {
        triggerAIMove();
    } else {
        updateStatusText();
    }
}

function triggerAIMove() {
    aiThinking = true;
    let dotCount = 1;
    UI.updateStatusText(statusElement, `${player2Name} is thinking.`);
    
    if (aiThinkingInterval) clearInterval(aiThinkingInterval);
    aiThinkingInterval = setInterval(() => {
        dotCount = (dotCount % 3) + 1;
        UI.updateStatusText(statusElement, `${player2Name} is thinking` + '.'.repeat(dotCount));
    }, 400);

    setTimeout(() => {
        makeAIMove();
        if (aiThinkingInterval) {
            clearInterval(aiThinkingInterval);
            aiThinkingInterval = null;
        }
        if (!gameOver) updateStatusText();
    }, 800);
}

function updateStatusText() {
    const activeName = currentPlayer === 'red' ? player1Name : player2Name;
    UI.updateStatusText(statusElement, `${activeName}'s Turn (${currentPlayer === 'red' ? 'Red' : 'Yellow'})`);
}

function updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = `${player1Name} ${player1Score} vs ${player2Name} ${player2Score}`;
    }
}

// --- AI Logic ---

function makeAIMove() {
    const validCols = Game.getValidColumns(board);
    let bestCol = validCols[0];
    let bestScore = -Infinity;

    for (let col of validCols) {
        const r = Game.getAvailableRow(board, col);
        board[r][col] = 'yellow';
        let score = minimax(board, 5, -Infinity, Infinity, false);
        board[r][col] = null;
        if (score > bestScore) {
            bestScore = score;
            bestCol = col;
        }
    }
    aiThinking = false;
    handleMove(bestCol);
}

function minimax(board, depth, alpha, beta, maximizingPlayer) {
    if (depth === 0 || Game.checkWinning(board, 'red') || Game.checkWinning(board, 'yellow')) {
        if (Game.checkWinning(board, 'yellow')) return 10000;
        if (Game.checkWinning(board, 'red')) return -10000;
        if (Game.isBoardFull(board)) return 0;
        return Game.scoreBoard(board, 'yellow');
    }

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (let col of Game.getValidColumns(board)) {
            const r = Game.getAvailableRow(board, col);
            board[r][col] = 'yellow';
            let evalScore = minimax(board, depth - 1, alpha, beta, false);
            board[r][col] = null;
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let col of Game.getValidColumns(board)) {
            const r = Game.getAvailableRow(board, col);
            board[r][col] = 'red';
            let evalScore = minimax(board, depth - 1, alpha, beta, true);
            board[r][col] = null;
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// --- Initialization ---

window.setGameMode = setGameMode;
window.setDifficulty = setDifficulty;
window.savePlayerNames = savePlayerNames;
window.startGame = startGame;
window.resetGame = resetGame;
window.returnToMain = returnToMain;
window.returnToMainFromModal = returnToMainFromModal;
window.playAgain = playAgain;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.saveNetworkName = saveNetworkName;
window.startNetworkGame = startNetworkGame;
window.copyInviteLink = copyInviteLink;

UI.createBoardUI(boardElement, Game.rows, Game.cols, handleMove);
updateScoreDisplay();

export function createRoom() {
    const name = document.getElementById('network-name').value;
    if (!name) return alert('Enter a name');
    const roomId = Network.generateRoomId();
    document.getElementById('network-actions').style.display = 'none';
    document.getElementById('display-room-id').textContent = roomId;
    peer = new Peer(roomId);
    isHost = true;
    peer.on('connection', (c) => {
        conn = c;
        conn.on('open', () => {
            UI.updateStatusText(statusElement, 'Opponent joined!');
            conn.send({ type: 'NAME', name: document.getElementById('network-name').value });
            conn.send({ type: 'STATE', board: board, currentPlayer: currentPlayer });
        });
        conn.on('data', (data) => {
            if (data.type === 'MOVE') {
                handleMove(data.col, true);
            } else if (data.type === 'NAME') {
                player2Name = data.name;
                updateScoreDisplay();
            } else if (data.type === 'RESET') {
                resetGame(true);
            } else if (data.type === 'PLAY_AGAIN') {
                playAgain(true);
            } else if (data.type === 'STATE') {
                board = data.board;
                currentPlayer = data.currentPlayer;
                UI.updateBoardUI(board, -1, -1);
                updateStatusText();
            }
        });
    });
    document.getElementById('room-controls').style.display = 'block';
    document.getElementById('start-game-btn').style.display = 'none';
}

export function joinRoom() {
    const name = document.getElementById('network-name').value;
    const roomId = document.getElementById('join-room-id').value;
    if (!name || !Network.isValidRoomId(roomId)) return alert('Enter name and valid room ID');
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(roomId);
        conn.on('open', () => {
            UI.updateStatusText(statusElement, 'Connected to host!');
            conn.send({ type: 'NAME', name: document.getElementById('network-name').value });
        });
        conn.on('data', (data) => {
            if (data.type === 'MOVE') {
                handleMove(data.col, true);
            } else if (data.type === 'NAME') {
                player2Name = data.name;
                updateScoreDisplay();
            } else if (data.type === 'RESET') {
                resetGame(true);
            } else if (data.type === 'PLAY_AGAIN') {
                playAgain(true);
            } else if (data.type === 'STATE') {
                board = data.board;
                currentPlayer = data.currentPlayer;
                UI.updateBoardUI(board, -1, -1);
                updateStatusText();
            }
        });
    });
}

export function copyInviteLink() {
    const roomId = document.getElementById('display-room-id').textContent;
    const url = window.location.origin + window.location.pathname + '?room=' + roomId;
    navigator.clipboard.writeText(url).then(() => alert('Invite link copied!'));
}

export function saveNetworkName() {
    const name = document.getElementById('network-name').value;
    if (!name) return alert('Enter a name');
    document.getElementById('network-actions').style.display = 'block';
}

export function startNetworkGame() {
    const roomId = document.getElementById('join-room-id').value;
    if (roomId) {
        joinRoom();
    } else {
        document.getElementById('network-actions').style.display = 'block';
    }
}
