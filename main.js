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

export function resetGame() {
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

export function playAgain() {
    resetGame();
}

// --- Move Handling ---

function handleMove(col) {
    if (gameOver || aiThinking) return;
    const r = Game.getAvailableRow(board, col);
    if (r === -1) return;

    board[r][col] = currentPlayer;
    UI.updateBoardUI(board, r, col);
    playDropSound();

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

UI.createBoardUI(boardElement, Game.rows, Game.cols, handleMove);
updateScoreDisplay();

export function createRoom() {
    const name = document.getElementById('network-name').value;
    if (!name) return alert('Enter a name');
    const roomId = Network.generateRoomId();
    // TODO: PeerJS logic
    alert('Room created: ' + roomId);
}

export function joinRoom() {
    const name = document.getElementById('network-name').value;
    const roomId = document.getElementById('join-room-id').value;
    if (!name || !Network.isValidRoomId(roomId)) return alert('Enter name and valid room ID');
    // TODO: PeerJS logic
    alert('Joining room: ' + roomId);
}
