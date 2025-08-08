
// Game state
let currentPlayer = 'white';
let selectedSquare = null;
let gameHistory = [];
let isFlipped = false;
let gameOver = false;
let rotationAngle = 0; // 0, 90, 180, 270 degrees
let capturedWhitePieces = [];
let capturedBlackPieces = [];

// Initial board setup - using simple letters for pieces
let board = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

// Piece symbols mapping
const pieceSymbols = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Initialize the game
function init() {
    createBoard();
    updateBoard();
    updateCapturedPieces();
    setupEventListeners();
}

function createBoard() {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;
            square.addEventListener('click', handleSquareClick);
            chessboard.appendChild(square);
        }
    }
}

function setupEventListeners() {
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('rotate-btn').addEventListener('click', rotateBoard);
    document.getElementById('back-btn').addEventListener('click', undoMove);
}

function updateBoard() {
    const squares = document.querySelectorAll('.square');

    squares.forEach(square => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const actualRow = isFlipped ? 7 - row : row;
        const actualCol = isFlipped ? 7 - col : col;
        const piece = board[actualRow][actualCol];

        square.innerHTML = '';
        square.className = square.className.replace(/\b(selected|valid-move|capture-move)\b/g, '');

        if (piece) {
            const symbol = pieceSymbols[piece];
            square.textContent = symbol;
            const isWhitePiece = piece === piece.toUpperCase();
            const colorClass = isWhitePiece ? 'white-piece' : 'black-piece';
            square.classList.add(colorClass);

            // Debug logging for flipped board
            if (isFlipped) {
                console.log(`Flipped board - Piece: ${piece}, isWhite: ${isWhitePiece}, colorClass: ${colorClass}, displayRow: ${row}, displayCol: ${col}, actualRow: ${actualRow}, actualCol: ${actualCol}`);
            }
        }
    });

    updateGameInfo();
}

function handleSquareClick(event) {
    if (gameOver) return;

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    const actualRow = isFlipped ? 7 - row : row;
    const actualCol = isFlipped ? 7 - col : col;

    if (selectedSquare) {
        if (selectedSquare.row === actualRow && selectedSquare.col === actualCol) {
            clearSelection();
            return;
        }

        if (isValidMove(selectedSquare.row, selectedSquare.col, actualRow, actualCol)) {
            makeMove(selectedSquare.row, selectedSquare.col, actualRow, actualCol);
            clearSelection();
            switchTurn();
        } else {
            const piece = board[actualRow][actualCol];
            if (piece && isPlayerPiece(piece, currentPlayer)) {
                selectSquare(actualRow, actualCol);
            } else {
                clearSelection();
            }
        }
    } else {
        const piece = board[actualRow][actualCol];
        if (piece && isPlayerPiece(piece, currentPlayer)) {
            selectSquare(actualRow, actualCol);
        }
    }
}

function selectSquare(row, col) {
    selectedSquare = { row, col };
    clearHighlights();

    const displayRow = isFlipped ? 7 - row : row;
    const displayCol = isFlipped ? 7 - col : col;
    const square = document.querySelector(`[data-row="${displayRow}"][data-col="${displayCol}"]`);
    square.classList.add('selected');

    highlightValidMoves(row, col);
}

function clearSelection() {
    selectedSquare = null;
    clearHighlights();
}

function clearHighlights() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        square.classList.remove('selected', 'valid-move', 'capture-move');
    });
}

function highlightValidMoves(row, col) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (isValidMove(row, col, r, c)) {
                const displayRow = isFlipped ? 7 - r : r;
                const displayCol = isFlipped ? 7 - c : c;
                const square = document.querySelector(`[data-row="${displayRow}"][data-col="${displayCol}"]`);

                if (board[r][c]) {
                    square.classList.add('capture-move');
                } else {
                    square.classList.add('valid-move');
                }
            }
        }
    }
}

function isPlayerPiece(piece, player) {
    if (!piece) return false;
    if (player === 'white') {
        return piece === piece.toUpperCase();
    } else {
        return piece === piece.toLowerCase();
    }
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
    if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8) return false;

    const piece = board[fromRow][fromCol];
    const target = board[toRow][toCol];

    if (!piece) return false;
    if (target && isPlayerPiece(piece, currentPlayer) && isPlayerPiece(target, currentPlayer)) {
        return false;
    }

    return isPieceMovementValid(piece, fromRow, fromCol, toRow, toCol);
}

function isPieceMovementValid(piece, fromRow, fromCol, toRow, toCol) {
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    const pieceLower = piece.toLowerCase();

    switch (pieceLower) {
        case 'p': // Pawn
            return isValidPawnMove(piece, fromRow, fromCol, toRow, toCol);
        case 'r': // Rook
            return (fromRow === toRow || fromCol === toCol) && !isPathBlocked(fromRow, fromCol, toRow, toCol);
        case 'b': // Bishop
            return absRowDiff === absColDiff && !isPathBlocked(fromRow, fromCol, toRow, toCol);
        case 'q': // Queen
            return ((fromRow === toRow || fromCol === toCol) || (absRowDiff === absColDiff)) &&
                !isPathBlocked(fromRow, fromCol, toRow, toCol);
        case 'n': // Knight
            return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
        case 'k': // King
            return absRowDiff <= 1 && absColDiff <= 1;
        default:
            return false;
    }
}

function isValidPawnMove(piece, fromRow, fromCol, toRow, toCol) {
    const direction = piece === piece.toUpperCase() ? -1 : 1; // White moves up (-1), black down (+1)
    const rowDiff = toRow - fromRow;
    const colDiff = Math.abs(toCol - fromCol);
    const startRow = piece === piece.toUpperCase() ? 6 : 1;

    // Forward move
    if (colDiff === 0) {
        if (board[toRow][toCol]) return false; // Blocked
        if (rowDiff === direction) return true; // One square
        if (rowDiff === 2 * direction && fromRow === startRow) return true; // Initial two squares
    }
    // Capture
    else if (colDiff === 1 && rowDiff === direction) {
        return !!board[toRow][toCol]; // Must capture something
    }

    return false;
}

function isPathBlocked(fromRow, fromCol, toRow, toCol) {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

    let row = fromRow + rowStep;
    let col = fromCol + colStep;

    while (row !== toRow || col !== toCol) {
        if (board[row][col]) return true;
        row += rowStep;
        col += colStep;
    }

    return false;
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const captured = board[toRow][toCol];

    // Track captured pieces
    if (captured) {
        if (captured === captured.toUpperCase()) {
            // White piece captured
            capturedWhitePieces.push(captured);
        } else {
            // Black piece captured
            capturedBlackPieces.push(captured);
        }
    }

    // Save move to history
    gameHistory.push({
        from: [fromRow, fromCol],
        to: [toRow, toCol],
        piece: piece,
        captured: captured
    });

    // Make the move
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;

    updateBoard();
    updateMoveHistory();
    updateCapturedPieces();
}

function switchTurn() {
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    updateBoard();
}

function undoMove() {
    if (gameHistory.length === 0) return;

    const lastMove = gameHistory.pop();

    // Remove captured piece from tracking if there was a capture
    if (lastMove.captured) {
        if (lastMove.captured === lastMove.captured.toUpperCase()) {
            // White piece was captured, remove it from captured list
            const index = capturedWhitePieces.lastIndexOf(lastMove.captured);
            if (index > -1) {
                capturedWhitePieces.splice(index, 1);
            }
        } else {
            // Black piece was captured, remove it from captured list
            const index = capturedBlackPieces.lastIndexOf(lastMove.captured);
            if (index > -1) {
                capturedBlackPieces.splice(index, 1);
            }
        }
    }

    // Restore the board
    board[lastMove.from[0]][lastMove.from[1]] = lastMove.piece;
    board[lastMove.to[0]][lastMove.to[1]] = lastMove.captured;

    // Switch turn back
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';

    updateBoard();
    updateMoveHistory();
    updateCapturedPieces();
}

function flipBoard() {
    isFlipped = !isFlipped;
    updateBoard();
}

function rotateBoard() {
    rotationAngle = (rotationAngle + 90) % 360;
    const chessboard = document.getElementById('chessboard');

    // Remove all rotation classes
    chessboard.classList.remove('rotated-90', 'rotated-180', 'rotated-270');

    // Add the appropriate rotation class
    if (rotationAngle === 90) {
        chessboard.classList.add('rotated-90');
    } else if (rotationAngle === 180) {
        chessboard.classList.add('rotated-180');
    } else if (rotationAngle === 270) {
        chessboard.classList.add('rotated-270');
    }
}

function resetGame() {
    // Show confirmation dialog
    const confirmed = confirm("Are you sure you want to reset the game?");

    // Only reset if user confirms
    if (!confirmed) {
        return;
    }

    board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];

    currentPlayer = 'white';
    selectedSquare = null;
    gameHistory = [];
    gameOver = false;
    isFlipped = false;
    rotationAngle = 0;
    capturedWhitePieces = [];
    capturedBlackPieces = [];

    // Reset board rotation
    const chessboard = document.getElementById('chessboard');
    chessboard.classList.remove('rotated-90', 'rotated-180', 'rotated-270');

    updateBoard();
    updateMoveHistory();
    updateCapturedPieces();
}

function updateGameInfo() {
    document.getElementById('current-turn').textContent =
        currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1) + ' to move';
}

function updateMoveHistory() {
    const moveList = document.getElementById('move-list');
    moveList.innerHTML = '';

    for (let i = 0; i < gameHistory.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = gameHistory[i];
        const blackMove = gameHistory[i + 1];

        let moveText = `${moveNumber}. ${formatMove(whiteMove)}`;
        if (blackMove) {
            moveText += ` ${formatMove(blackMove)}`;
        }

        const moveDiv = document.createElement('div');
        moveDiv.textContent = moveText;
        moveList.appendChild(moveDiv);
    }
}

function updateCapturedPieces() {
    const capturedWhiteContainer = document.getElementById('captured-pieces-left');
    const capturedBlackContainer = document.getElementById('captured-pieces-right');

    // Clear previous pieces
    capturedWhiteContainer.innerHTML = '';
    capturedBlackContainer.innerHTML = '';

    // Display captured white pieces (left side)
    capturedWhitePieces.forEach(piece => {
        const pieceElement = document.createElement('div');
        pieceElement.textContent = pieceSymbols[piece];
        pieceElement.className = 'white-piece';
        pieceElement.style.fontSize = '64px';
        pieceElement.style.display = 'flex';
        pieceElement.style.justifyContent = 'center';
        pieceElement.style.alignItems = 'center';
        pieceElement.style.height = '90px';
        pieceElement.style.width = '90px';
        capturedWhiteContainer.appendChild(pieceElement);
    });

    // Display captured black pieces (right side)
    capturedBlackPieces.forEach(piece => {
        const pieceElement = document.createElement('div');
        pieceElement.textContent = pieceSymbols[piece];
        pieceElement.className = 'black-piece';
        pieceElement.style.fontSize = '64px';
        pieceElement.style.display = 'flex';
        pieceElement.style.justifyContent = 'center';
        pieceElement.style.alignItems = 'center';
        pieceElement.style.height = '90px';
        pieceElement.style.width = '90px';
        capturedBlackContainer.appendChild(pieceElement);
    });
}

function formatMove(move) {
    const from = move.from;
    const to = move.to;
    const fromSquare = String.fromCharCode(97 + from[1]) + (8 - from[0]);
    const toSquare = String.fromCharCode(97 + to[1]) + (8 - to[0]);

    let pieceSymbol = '';
    const piece = move.piece.toLowerCase();
    if (piece === 'k') pieceSymbol = 'K';
    else if (piece === 'q') pieceSymbol = 'Q';
    else if (piece === 'r') pieceSymbol = 'R';
    else if (piece === 'b') pieceSymbol = 'B';
    else if (piece === 'n') pieceSymbol = 'N';

    const captureSymbol = move.captured ? 'x' : '';

    if (piece === 'p' && captureSymbol) {
        return fromSquare[0] + captureSymbol + toSquare;
    }

    return pieceSymbol + captureSymbol + toSquare;
}

// Start the game
init();