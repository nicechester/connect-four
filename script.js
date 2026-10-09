const rows = 6;
const cols = 7;
let board = Array(rows).fill().map(() => Array(cols).fill(null));
let currentPlayer = 'red';
let gameOver = false;
let gameMode = 'pvp'; // 'pvp' or 'pve'
let aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
let aiThinking = false;

const boardElement = document.getElementById('game-board');
const statusElement = document.getElementById('status');
const difficultyContainer = document.getElementById('ai-difficulty-container');

function setGameMode(mode) {
    console.log(`[LOG] setGameMode: ${mode}`);
    gameMode = mode;
    difficultyContainer.style.display = mode === 'pve' ? 'inline-block' : 'none';
    resetGame();
}

function setDifficulty() {
    aiDifficulty = document.getElementById('ai-difficulty').value;
    console.log(`[LOG] setDifficulty: ${aiDifficulty}`);
    resetGame();
}

function createBoard() {
    console.log(`[LOG] createBoard initialized`);
    boardElement.innerHTML = '';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', () => {
                console.log(`[LOG] Cell clicked: row ${r}, col ${c}. currentPlayer=${currentPlayer}, aiThinking=${aiThinking}, gameOver=${gameOver}, gameMode=${gameMode}`);
                if (gameMode === 'pve' && currentPlayer === 'yellow' && !aiThinking) return;
                handleMove(c);
            });
            boardElement.appendChild(cell);
        }
    }
}

function handleMove(col) {
    console.log(`[LOG] handleMove start: col=${col}, currentPlayer=${currentPlayer}, aiThinking=${aiThinking}, gameOver=${gameOver}`);
    if (gameOver || aiThinking) {
        console.log(`[LOG] handleMove blocked: gameOver=${gameOver}, aiThinking=${aiThinking}`);
        return;
    }

    const r = getAvailableRow(board, col);
    console.log(`[LOG] getAvailableRow for col ${col} returned row ${r}`);
    if (r === -1) {
        console.log(`[LOG] Column ${col} is full.`);
        return; // Column is full
    }

    board[r][col] = currentPlayer;
    updateBoard();

    if (checkWinBoard(board, r, col, currentPlayer)) {
        statusElement.innerText = gameMode === 'pve' && currentPlayer === 'yellow' ? `AI Wins!` : `${currentPlayer.toUpperCase()} Wins!`;
        console.log(`[LOG] Win detected for ${currentPlayer}! Game over.`);
        gameOver = true;
        return;
    }

    if (isBoardFull(board)) {
        statusElement.innerText = "It's a Draw!";
        console.log(`[LOG] Board is full. It's a draw!`);
        gameOver = true;
        return;
    }

    currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
    console.log(`[LOG] Turn switched. New currentPlayer=${currentPlayer}`);
    
    if (gameMode === 'pve' && currentPlayer === 'yellow' && !gameOver) {
        statusElement.innerText = `AI is thinking...`;
        aiThinking = true;
        console.log(`[LOG] AI turn triggered. Setting aiThinking=true. Scheduling makeAIMove via setTimeout.`);
        setTimeout(() => {
            console.log(`[LOG] setTimeout fired for AI move. Calling makeAIMove()...`);
            makeAIMove();
            aiThinking = false;
            console.log(`[LOG] AI move completed. aiThinking reset to false.`);
            if (!gameOver) {
                updateStatusText();
            }
        }, 300);
    } else {
        updateStatusText();
    }
    console.log(`[LOG] handleMove end`);
}

function getAvailableRow(currentBoard, col) {
    for (let r = rows - 1; r >= 0; r--) {
        if (!currentBoard[r][col]) {
            return r;
        }
    }
    return -1;
}

function isBoardFull(currentBoard) {
    return currentBoard[0].every(cell => cell !== null);
}

function updateStatusText() {
    if (gameMode === 'pve') {
        statusElement.innerText = currentPlayer === 'red' ? "Your Turn (Red)" : "AI's Turn (Yellow)";
    } else {
        statusElement.innerText = `Player ${currentPlayer === 'red' ? '1' : '2'}'s Turn (${currentPlayer})`;
    }
    console.log(`[LOG] updateStatusText: "${statusElement.innerText}"`);
}

function makeAIMove() {
    console.log(`[LOG] makeAIMove start. aiDifficulty=${aiDifficulty}, gameOver=${gameOver}`);
    if (gameOver) return;

    let col;
    let startTime = performance.now();
    if (aiDifficulty === 'easy') {
        col = getRandomMove();
    } else if (aiDifficulty === 'medium') {
        col = getBestMove(2);
    } else { // hard
        col = getBestMove(4);
    }
    let endTime = performance.now();
    console.log(`[LOG] AI calculated move in ${(endTime - startTime).toFixed(2)}ms. Chosen column: ${col}`);

    if (col !== null && col !== undefined) {
        executeAIMove(col);
    } else {
        console.warn(`[LOG] AI returned null/undefined column!`);
    }
}

function executeAIMove(col) {
    console.log(`[LOG] executeAIMove start: col=${col}, currentPlayer=${currentPlayer}`);
    const r = getAvailableRow(board, col);
    if (r === -1) {
        console.log(`[LOG] AI chosen column ${col} is full.`);
        return;
    }

    board[r][col] = currentPlayer;
    updateBoard();

    if (checkWinBoard(board, r, col, currentPlayer)) {
        statusElement.innerText = `AI Wins!`;
        console.log(`[LOG] Win detected for AI! Game over.`);
        gameOver = true;
        return;
    }

    if (isBoardFull(board)) {
        statusElement.innerText = "It's a Draw!";
        console.log(`[LOG] Board is full. It's a draw!`);
        gameOver = true;
        return;
    }

    currentPlayer = 'red';
    console.log(`[LOG] Turn switched back to player. currentPlayer=${currentPlayer}`);
    updateStatusText();
}

function getRandomMove() {
    const validCols = [];
    for (let c = 0; c < cols; c++) {
        if (getAvailableRow(board, c) !== -1) {
            validCols.push(c);
        }
    }
    if (validCols.length === 0) return null;
    return validCols[Math.floor(Math.random() * validCols.length)];
}

// Minimax with Alpha-Beta Pruning
function getBestMove(depth) {
    console.log(`[LOG] getBestMove start with depth=${depth}`);
    let bestScore = -Infinity;
    let bestCol = null;
    const validCols = getValidColumns(board);

    // Prioritize center columns for better heuristic tie-breaking
    validCols.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

    for (let col of validCols) {
        const r = getAvailableRow(board, col);
        board[r][col] = 'yellow'; // AI is yellow
        let score = minimax(board, depth - 1, false, -Infinity, Infinity);
        board[r][col] = null;

        console.log(`[LOG] AI evaluation for col ${col}: score = ${score}`);

        if (score > bestScore) {
            bestScore = score;
            bestCol = col;
        }
    }

    console.log(`[LOG] getBestMove end. bestCol=${bestCol}, bestScore=${bestScore}`);
    return bestCol !== null ? bestCol : validCols[0];
}

function getValidColumns(currentBoard) {
    const valid = [];
    for (let c = 0; c < cols; c++) {
        if (currentBoard[0][c] === null) {
            valid.push(c);
        }
    }
    return valid;
}

function minimax(currentBoard, depth, isMaximizing, alpha, beta) {
    // Check terminal states
    if (checkWinning(currentBoard, 'yellow')) return 100000 + depth; // Favor quicker wins
    if (checkWinning(currentBoard, 'red')) return -100000 - depth; // Favor slower losses
    if (isBoardFull(currentBoard) || depth === 0) {
        return scoreBoard(currentBoard, 'yellow');
    }

    const validCols = getValidColumns(currentBoard);
    validCols.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let col of validCols) {
            const r = getAvailableRow(currentBoard, col);
            currentBoard[r][col] = 'yellow';
            let evaluation = minimax(currentBoard, depth - 1, false, alpha, beta);
            currentBoard[r][col] = null;
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let col of validCols) {
            const r = getAvailableRow(currentBoard, col);
            currentBoard[r][col] = 'red';
            let evaluation = minimax(currentBoard, depth - 1, true, alpha, beta);
            currentBoard[r][col] = null;
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function checkWinning(currentBoard, player) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (currentBoard[r][c] === player) {
                if (checkWinBoard(currentBoard, r, c, player)) return true;
            }
        }
    }
    return false;
}

function checkWinBoard(currentBoard, r, c, player) {
    const directions = [
        [0, 1], [1, 0], [1, 1], [1, -1]
    ];

    for (let [dr, dc] of directions) {
        let count = 1;
        count += countInDirectionBoard(currentBoard, r, c, dr, dc, player);
        count += countInDirectionBoard(currentBoard, r, c, -dr, -dc, player);
        if (count >= 4) return true;
    }
    return false;
}

function countInDirectionBoard(currentBoard, r, c, dr, dc, player) {
    let count = 0;
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < rows && nc >= 0 && nc < cols && currentBoard[nr][nc] === player) {
        count++;
        nr += dr;
        nc += dc;
    }
    return count;
}

function scoreBoard(currentBoard, player) {
    let score = 0;

    // Score center column preference
    let centerColumn = Math.floor(cols / 2);
    let centerCount = 0;
    for (let r = 0; r < rows; r++) {
        if (currentBoard[r][centerColumn] === player) {
            centerCount++;
        }
    }
    score += centerCount * 10;

    // Score all windows of 4
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Horizontal
            if (c <= cols - 4) {
                let window = [currentBoard[r][c], currentBoard[r][c+1], currentBoard[r][c+2], currentBoard[r][c+3]];
                score += evaluateWindow(window, player);
            }
            // Vertical
            if (r <= rows - 4) {
                let window = [currentBoard[r][c], currentBoard[r+1][c], currentBoard[r+2][c], currentBoard[r+3][c]];
                score += evaluateWindow(window, player);
            }
            // Positive diagonal
            if (r <= rows - 4 && c <= cols - 4) {
                let window = [currentBoard[r][c], currentBoard[r+1][c+1], currentBoard[r+2][c+2], currentBoard[r+3][c+3]];
                score += evaluateWindow(window, player);
            }
            // Negative diagonal
            if (r >= 3 && c <= cols - 4) {
                let window = [currentBoard[r][c], currentBoard[r-1][c+1], currentBoard[r-2][c+2], currentBoard[r-3][c+3]];
                score += evaluateWindow(window, player);
            }
        }
    }

    return score;
}

function evaluateWindow(window, player) {
    let score = 0;
    let opponent = player === 'yellow' ? 'red' : 'yellow';

    let playerCount = window.filter(cell => cell === player).length;
    let emptyCount = window.filter(cell => cell === null).length;
    let opponentCount = window.filter(cell => cell === opponent).length;

    if (playerCount === 3 && emptyCount === 1) {
        score += 100;
    } else if (playerCount === 2 && emptyCount === 2) {
        score += 10;
    }

    if (opponentCount === 3 && emptyCount === 1) {
        score -= 80;
    }

    return score;
}

function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const r = cell.dataset.row;
        const c = cell.dataset.col;
        cell.className = 'cell';
        if (board[r][c]) cell.classList.add(board[r][c]);
    });
}

function resetGame() {
    console.log(`[LOG] resetGame called`);
    board = Array(rows).fill().map(() => Array(cols).fill(null));
    currentPlayer = 'red';
    gameOver = false;
    aiThinking = false;
    updateStatusText();
    updateBoard();
}

createBoard();
