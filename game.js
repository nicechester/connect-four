export const rows = 6;
export const cols = 7;

export function createEmptyBoard() {
    return Array(rows).fill().map(() => Array(cols).fill(null));
}

export function getAvailableRow(board, col) {
    for (let r = rows - 1; r >= 0; r--) {
        if (!board[r][col]) {
            return r;
        }
    }
    return -1;
}

export function isBoardFull(board) {
    return board[0].every(cell => cell !== null);
}

export function checkWinBoard(board, r, c, player) {
    const directions = [
        [0, 1], [1, 0], [1, 1], [1, -1]
    ];

    for (let [dr, dc] of directions) {
        let count = 1;
        count += countInDirectionBoard(board, r, c, dr, dc, player);
        count += countInDirectionBoard(board, r, c, -dr, -dc, player);
        if (count >= 4) return true;
    }
    return false;
}

function countInDirectionBoard(board, r, c, dr, dc, player) {
    let count = 0;
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === player) {
        count++;
        nr += dr;
        nc += dc;
    }
    return count;
}

export function checkWinning(board, player) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c] === player) {
                if (checkWinBoard(board, r, c, player)) return true;
            }
        }
    }
    return false;
}

export function getValidColumns(board) {
    const valid = [];
    for (let c = 0; c < cols; c++) {
        if (board[0][c] === null) {
            valid.push(c);
        }
    }
    return valid;
}

export function scoreBoard(board, player) {
    let score = 0;
    let centerColumn = Math.floor(cols / 2);
    let centerCount = 0;
    for (let r = 0; r < rows; r++) {
        if (board[r][centerColumn] === player) {
            centerCount++;
        }
    }
    score += centerCount * 10;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (c <= cols - 4) {
                let window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
                score += evaluateWindow(window, player);
            }
            if (r <= rows - 4) {
                let window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
                score += evaluateWindow(window, player);
            }
            if (r <= rows - 4 && c <= cols - 4) {
                let window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
                score += evaluateWindow(window, player);
            }
            if (r >= 3 && c <= cols - 4) {
                let window = [board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]];
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

    if (playerCount === 3 && emptyCount === 1) score += 100;
    else if (playerCount === 2 && emptyCount === 2) score += 10;

    if (opponentCount === 3 && emptyCount === 1) score -= 80;
    return score;
}
