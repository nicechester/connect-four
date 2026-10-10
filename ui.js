export function updateBoardUI(board, targetR, targetC) {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        cell.classList.remove('red', 'yellow', 'dropping');
        if (board[r][c]) {
            cell.classList.add(board[r][c]);
            if (r === targetR && c === targetC) {
                cell.classList.add('dropping');
            }
        }
    });
}

export function updateStatusText(statusElement, text) {
    statusElement.innerText = text;
}

export function showResultModal(resultModalElement, resultMessageElement, resultModalContent, message) {
    resultMessageElement.innerText = message;
    resultModalElement.classList.add('active');
    resultModalContent.style.left = '50%';
    resultModalContent.style.top = '50%';
    resultModalContent.style.transform = 'translate(-50%, -50%)';
}

export function createBoardUI(boardElement, rows, cols, onCellClick) {
    boardElement.innerHTML = '';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', () => onCellClick(c));
            boardElement.appendChild(cell);
        }
    }
}
