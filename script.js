const rows = 6;
const cols = 7;
let board = Array(rows).fill().map(() => Array(cols).fill(null));
let currentPlayer = 'red';
let gameOver = false;
let gameMode = 'pvp'; // 'pvp' or 'pve'
let aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
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
const resultMessageElement = document.getElementById('result-message');

// Cookie helper functions
function setCookie(name, value, days = 30) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/";
}

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

// Load saved names from cookies on startup
function loadSavedNames() {
    const savedP1 = getCookie('connectFour_player1Name');
    const savedP2 = getCookie('connectFour_player2Name');
    const savedSingle = getCookie('connectFour_playerSingleName');

    if (savedP1) {
        player1Name = savedP1;
        const p1Input = document.getElementById('player1-name');
        if (p1Input) p1Input.value = savedP1;
    }
    if (savedP2) {
        player2Name = savedP2;
        const p2Input = document.getElementById('player2-name');
        if (p2Input) p2Input.value = savedP2;
    }
    if (savedSingle) {
        const singleInput = document.getElementById('player-single-name');
        if (singleInput) singleInput.value = savedSingle;
        if (!savedP1) player1Name = savedSingle;
    }
}

function setGameMode(mode) {
    console.log(`[LOG] setGameMode: ${mode}`);
    gameMode = mode;
    difficultyContainer.style.display = mode === 'pve' ? 'inline-block' : 'none';
    if (mode === 'pve') {
        pvpNamesContainer.style.display = 'none';
        pveNamesContainer.style.display = 'flex';
    } else {
        pvpNamesContainer.style.display = 'flex';
        pveNamesContainer.style.display = 'none';
    }
}

function setDifficulty() {
    aiDifficulty = document.getElementById('ai-difficulty').value;
    console.log(`[LOG] setDifficulty: ${aiDifficulty}`);
}

function savePlayerNames() {
    if (gameMode === 'pvp') {
        const p1Input = document.getElementById('player1-name').value.trim();
        const p2Input = document.getElementById('player2-name').value.trim();
        if (p1Input) {
            player1Name = p1Input;
            setCookie('connectFour_player1Name', p1Input);
        }
        if (p2Input) {
            player2Name = p2Input;
            setCookie('connectFour_player2Name', p2Input);
        }
    } else {
        const pInput = document.getElementById('player-single-name').value.trim();
        if (pInput) {
            player1Name = pInput;
            setCookie('connectFour_playerSingleName', pInput);
            setCookie('connectFour_player1Name', pInput);
        }
        player2Name = 'AI';
    }
    console.log(`[LOG] Names updated and saved to cookies: Player 1 = ${player1Name}, Player 2 = ${player2Name}`);
}

function startGame() {
    console.log(`[LOG] startGame called`);
    savePlayerNames();
    mainMenuElement.classList.remove('active');
    gameScreenElement.classList.add('active');
    resultModalElement.classList.remove('active');
    resetGame();
}

function returnToMain() {
    console.log(`[LOG] returnToMain called`);
    if (aiThinkingInterval) {
        clearInterval(aiThinkingInterval);
        aiThinkingInterval = null;
    }
    gameScreenElement.classList.remove('active');
    resultModalElement.classList.remove('active');
    mainMenuElement.classList.add('active');
}

function returnToMainFromModal() {
    console.log(`[LOG] returnToMainFromModal called`);
    resultModalElement.classList.remove('active');
    returnToMain();
}

function playAgain() {
    console.log(`[LOG] playAgain called`);
    resultModalElement.classList.remove('active');
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
    updateBoard(r, col);
    playDropSound();

    if (checkWinBoard(board, r, col, currentPlayer)) {
        const winnerName = currentPlayer === 'red' ? player1Name : player2Name;
        statusElement.innerText = `${winnerName} Wins!`;
        console.log(`[LOG] Win detected for ${winnerName}! Game over.`);
        gameOver = true;
        showResultModal(`${winnerName} Wins!`);
        return;
    }

    if (isBoardFull(board)) {
        statusElement.innerText = "It's a Draw!";
        console.log(`[LOG] Board is full. It's a draw!`);
        gameOver = true;
        showResultModal("It's a Draw!");
        return;
    }

    currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
    console.log(`[LOG] Turn switched. New currentPlayer=${currentPlayer}`);
    
    if (gameMode === 'pve' && currentPlayer === 'yellow' && !gameOver) {
        aiThinking = true;
        let dotCount = 1;
        statusElement.innerText = `${player2Name} is thinking.`;
        console.log(`[LOG] AI turn triggered. Setting aiThinking=true. Starting thinking animation interval.`);
        
        if (aiThinkingInterval) clearInterval(aiThinkingInterval);
        aiThinkingInterval = setInterval(() => {
            dotCount = (dotCount % 3) + 1;
            statusElement.innerText = `${player2Name} is thinking` + '.'.repeat(dotCount);
        }, 400);

        setTimeout(() => {
            console.log(`[LOG] setTimeout fired for AI move. Calling makeAIMove()...`);
            makeAIMove();
            aiThinking = false;
            if (aiThinkingInterval) {
                clearInterval(aiThinkingInterval);
                aiThinkingInterval = null;
            }
            console.log(`[LOG] AI move completed. aiThinking reset to false.`);
            if (!gameOver) {
                updateStatusText();
            }
        }, 800);
    } else {
        updateStatusText();
    }
    console.log(`[LOG] handleMove end`);
}

function showResultModal(message) {
    resultMessageElement.innerText = message;
    resultModalElement.classList.add('active');
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
    const activeName = currentPlayer === 'red' ? player1Name : player2Name;
    statusElement.innerText = `${activeName}'s Turn (${currentPlayer === 'red' ? 'Red' : 'Yellow'})`;
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
    updateBoard(r, col);
    playDropSound();

    if (checkWinBoard(board, r, col, currentPlayer)) {
        statusElement.innerText = `${player2Name} Wins!`;
        console.log(`[LOG] Win detected for AI! Game over.`);
        gameOver = true;
        showResultModal(`${player2Name} Wins!`);
        return;
    }

    if (isBoardFull(board)) {
        statusElement.innerText = "It's a Draw!";
        console.log(`[LOG] Board is full. It's a draw!`);
        gameOver = true;
        showResultModal("It's a Draw!");
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

function updateBoard(targetR, targetC) {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        
        // Remove existing classes
        cell.classList.remove('red', 'yellow', 'dropping');
        
        // Apply current state
        if (board[r][c]) {
            cell.classList.add(board[r][c]);
            if (r === targetR && c === targetC) {
                cell.classList.add('dropping');
            }
        }
    });
}

function resetGame() {
    console.log(`[LOG] resetGame called`);
    if (gameMode === 'pvp') {
        const p1Input = document.getElementById('player1-name').value.trim();
        const p2Input = document.getElementById('player2-name').value.trim();
        if (p1Input) player1Name = p1Input;
        if (p2Input) player2Name = p2Input;
    } else {
        const pInput = document.getElementById('player-single-name').value.trim();
        if (pInput) player1Name = pInput;
        player2Name = 'AI';
    }

    board = Array(rows).fill().map(() => Array(cols).fill(null));
    currentPlayer = 'red';
    gameOver = false;
    aiThinking = false;
    if (aiThinkingInterval) {
        clearInterval(aiThinkingInterval);
        aiThinkingInterval = null;
    }
    updateStatusText();
    updateBoard();
}

loadSavedNames();
createBoard();
updateStatusText();
