import * as Game from './game.js';
import * as UI from './ui.js';
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

const boardElement = document.getElementById('game-board');
const statusElement = document.getElementById('status');
const difficultyContainer = document.getElementById('ai-difficulty-container');
const pvpNamesContainer = document.getElementById('pvp-names');
const pveNamesContainer = document.getElementById('pve-names');
const mainMenuElement = document.getElementById('main-menu');
const gameScreenElement = document.getElementById('game-screen');
const resultModalElement = document.getElementById('result-modal');
const resultModalContent = resultModalElement.querySelector('.modal-content');
const resultMessageElement = document.getElementById('result-message');

// ... (Cookie functions and Draggable Modal Logic from original script.js)
// I will keep these here for now as they are UI-related but specific to this app's state

function handleMove(col) {
    if (gameOver || aiThinking) return;
    const r = Game.getAvailableRow(board, col);
    if (r === -1) return;

    board[r][col] = currentPlayer;
    UI.updateBoardUI(board, r, col);
    playDropSound();

    if (Game.checkWinBoard(board, r, col, currentPlayer)) {
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
        aiThinking = false;
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

// ... (Minimax and AI logic would go here, calling Game functions)
// I'll keep the AI logic in main.js for now as it orchestrates the game flow.

// ... (Initialization)
UI.createBoardUI(boardElement, Game.rows, Game.cols, handleMove);
