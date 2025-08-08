document.addEventListener('DOMContentLoaded', () => {
    // Game state
    const gameState = {
        board: [],
        currentPlayer: 'white',
        selectedPiece: null,
        moveHistory: [],
        capturedPieces: { white: [], black: [] },
        isFlipped: false
    };

    // Unicode chess pieces
    const pieces = {
        white: {
            king: '♔', queen: '♕', rook: '♖',
            bishop: '♗', knight: '♘', pawn: '♙'
        },
        black: {
            king: '♚', queen: '♛', rook: '♜',
            bishop: '♝', knight: '♞', pawn: '♟'
        }
    };

    // Initialize the board
    function initializeBoard() {
        const board = Array(8).fill().map(() => Array(8).fill(null));

        // Place pawns
        for (let i = 0; i < 8; i++) {
            board[1][i] = { type: 'pawn', color: 'black', symbol: pieces.black.pawn };
            board[6][i] = { type: 'pawn', color: 'white', symbol: pieces.white.pawn };
        }

        // Place other pieces
        const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let i = 0; i < 8; i++) {
            board[0][i] = { type: backRow[i], color: 'black', symbol: pieces.black[backRow[i]] };
            board[7][i] = { type: backRow[i], color: 'white', symbol: pieces.white[backRow[i]] };
        }

        return board;
    }

    // Render the chessboard
    function renderBoard() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const displayRow = gameState.isFlipped ? 7 - row : row;
                const displayCol = gameState.isFlipped ? 7 - col : col;

                const square = document.createElement('div');
                square.classList.add('square');
                square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = displayRow;
                square.dataset.col = displayCol;

                const piece = gameState.board[displayRow][displayCol];
                if (piece) {
                    square.textContent = piece.symbol;
                    square.classList.add(piece.color + '-piece');
                }

                square.addEventListener('click', handleSquareClick);
                chessboard.appendChild(square);
            }
        }

        updateCapturedPieces();
        updateTurnIndicator();
        updateMoveHistory();
    }

    // Handle square click
    function handleSquareClick(event) {
        const square = event.target;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);

        // If a piece is already selected
        if (gameState.selectedPiece) {
            const { row: selectedRow, col: selectedCol } = gameState.selectedPiece;

            // If clicking on a valid move square
            if (square.classList.contains('valid-move') || square.classList.contains('valid-capture')) {
                movePiece(selectedRow, selectedCol, row, col);
                clearHighlights();
                gameState.selectedPiece = null;
                return;
            }

            // If clicking on another piece of the same color
            if (gameState.board[row][col] &&
                gameState.board[row][col].color === gameState.currentPlayer) {
                clearHighlights();
                selectPiece(row, col);
                return;
            }

            // Otherwise deselect
            clearHighlights();
            gameState.selectedPiece = null;
            return;
        }

        // If no piece is selected, select this piece if it belongs to current player
        if (gameState.board[row][col] &&
            gameState.board[row][col].color === gameState.currentPlayer) {
            selectPiece(row, col);
        }
    }

    // Select a piece and show valid moves
    function selectPiece(row, col) {
        gameState.selectedPiece = { row, col };
        clearHighlights();

        // Highlight the selected piece
        const displayRow = gameState.isFlipped ? 7 - row : row;
        const displayCol = gameState.isFlipped ? 7 - col : col;
        const square = document.querySelector(`.square[data-row="${displayRow}"][data-col="${displayCol}"]`);
        square.classList.add('selected');

        // Show valid moves
        const piece = gameState.board[row][col];
        if (!piece) return;

        const moves = getPossibleMoves(row, col, piece);
        moves.forEach(move => {
            const targetDisplayRow = gameState.isFlipped ? 7 - move.row : move.row;
            const targetDisplayCol = gameState.isFlipped ? 7 - move.col : move.col;
            const targetSquare = document.querySelector(`.square[data-row="${targetDisplayRow}"][data-col="${targetDisplayCol}"]`);
            if (targetSquare) {
                if (gameState.board[move.row][move.col]) {
                    targetSquare.classList.add('valid-capture');
                } else {
                    targetSquare.classList.add('valid-move');
                }
            }
        });
    }

    // Get possible moves
    function getPossibleMoves(row, col, piece) {
        const moves = [];
        const direction = piece.color === 'white' ? -1 : 1;

        // Pawn moves
        if (piece.type === 'pawn') {
            // Forward move
            if (isValidPosition(row + direction, col) &&
                !gameState.board[row + direction][col]) {
                moves.push({ row: row + direction, col });

                // Initial double move
                const startRow = piece.color === 'white' ? 6 : 1;
                if (row === startRow &&
                    !gameState.board[row + 2 * direction][col]) {
                    moves.push({ row: row + 2 * direction, col });
                }
            }

            // Captures
            [-1, 1].forEach(offset => {
                const newCol = col + offset;
                if (isValidPosition(row + direction, newCol) &&
                    gameState.board[row + direction][newCol] &&
                    gameState.board[row + direction][newCol].color !== piece.color) {
                    moves.push({ row: row + direction, col: newCol });
                }
            });
        }

        // Simple moves for other pieces
        if (piece.type !== 'pawn') {
            const directions = {
                rook: [[-1, 0], [1, 0], [0, -1], [0, 1]],
                bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
                queen: [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]],
                king: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
                knight: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
            };

            const dirs = directions[piece.type] || [];
            for (const [dr, dc] of dirs) {
                let newRow = row + dr;
                let newCol = col + dc;

                // For sliding pieces (rook, bishop, queen)
                if (['rook', 'bishop', 'queen'].includes(piece.type)) {
                    while (isValidPosition(newRow, newCol)) {
                        if (!gameState.board[newRow][newCol]) {
                            moves.push({ row: newRow, col: newCol });
                        } else {
                            if (gameState.board[newRow][newCol].color !== piece.color) {
                                moves.push({ row: newRow, col: newCol });
                            }
                            break;
                        }
                        newRow += dr;
                        newCol += dc;
                    }
                }
                // For single moves (king, knight)
                else {
                    if (isValidPosition(newRow, newCol)) {
                        if (!gameState.board[newRow][newCol] ||
                            gameState.board[newRow][newCol].color !== piece.color) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                }
            }
        }

        return moves;
    }

    // Check if position is valid
    function isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    // Move a piece
    function movePiece(fromRow, fromCol, toRow, toCol) {
        const piece = gameState.board[fromRow][fromCol];
        const capturedPiece = gameState.board[toRow][toCol];

        // Handle captured piece
        if (capturedPiece) {
            gameState.capturedPieces[capturedPiece.color].push(capturedPiece);
        }

        // Move the piece
        gameState.board[toRow][toCol] = piece;
        gameState.board[fromRow][fromCol] = null;

        // Add to move history
        gameState.moveHistory.push({
            piece: piece,
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            captured: capturedPiece,
            player: gameState.currentPlayer
        });

        // Switch player
        gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';

        renderBoard();
    }

    // Clear highlights
    function clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'valid-capture');
        });
    }

    // Update captured pieces display
    function updateCapturedPieces() {
        const topContainer = document.getElementById('captured-pieces-top');
        const bottomContainer = document.getElementById('captured-pieces-bottom');

        topContainer.innerHTML = '';
        bottomContainer.innerHTML = '';

        // Display captured white pieces at top
        gameState.capturedPieces.white.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.textContent = piece.symbol;
            pieceElement.classList.add('captured-piece', 'white-piece');
            topContainer.appendChild(pieceElement);
        });

        // Display captured black pieces at bottom
        gameState.capturedPieces.black.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.textContent = piece.symbol;
            pieceElement.classList.add('captured-piece', 'black-piece');
            bottomContainer.appendChild(pieceElement);
        });
    }

    // Update turn indicator
    function updateTurnIndicator() {
        const turnElement = document.getElementById('current-turn');
        turnElement.textContent = `${gameState.currentPlayer.charAt(0).toUpperCase() + gameState.currentPlayer.slice(1)} to move`;
    }

    // Update move history
    function updateMoveHistory() {
        const moveList = document.getElementById('move-list');
        moveList.innerHTML = '';

        for (let i = 0; i < gameState.moveHistory.length; i++) {
            const move = gameState.moveHistory[i];
            const moveEntry = document.createElement('div');
            moveEntry.classList.add('move-entry');

            // Format move notation (simplified)
            const pieceSymbol = move.piece.type === 'pawn' ? '' : move.piece.type.charAt(0).toUpperCase();
            const captureSymbol = move.captured ? 'x' : '';
            const colLetter = String.fromCharCode(97 + move.to.col);
            const rowNumber = 8 - move.to.row;

            moveEntry.textContent = `${pieceSymbol}${captureSymbol}${colLetter}${rowNumber}`;
            moveList.appendChild(moveEntry);
        }

        // Scroll to bottom
        moveList.scrollTop = moveList.scrollHeight;
    }

    // Rotate board
    function rotateBoard() {
        gameState.isFlipped = !gameState.isFlipped;
        document.getElementById('chessboard').classList.toggle('rotated');
        renderBoard();
    }

    // Reset game
    function resetGame() {
        if (confirm("Are you sure you want to reset the game?")) {
            gameState.board = initializeBoard();
            gameState.currentPlayer = 'white';
            gameState.selectedPiece = null;
            gameState.moveHistory = [];
            gameState.capturedPieces = { white: [], black: [] };
            gameState.isFlipped = false;

            document.getElementById('chessboard').classList.remove('rotated');
            renderBoard();
        }
    }

    // Undo move
    function undoMove() {
        if (gameState.moveHistory.length === 0) {
            alert("No moves to undo!");
            return;
        }

        const lastMove = gameState.moveHistory.pop();

        // Restore the moved piece
        gameState.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;

        // Restore captured piece or clear destination
        if (lastMove.captured) {
            gameState.board[lastMove.to.row][lastMove.to.col] = lastMove.captured;

            // Remove from captured pieces
            const capturedArray = gameState.capturedPieces[lastMove.captured.color];
            const index = capturedArray.findIndex(p => p.symbol === lastMove.captured.symbol);
            if (index !== -1) {
                capturedArray.splice(index, 1);
            }
        } else {
            gameState.board[lastMove.to.row][lastMove.to.col] = null;
        }

        // Switch player back
        gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';

        renderBoard();
    }

    // Initialize game
    function init() {
        gameState.board = initializeBoard();
        renderBoard();

        // Event listeners
        document.getElementById('reset-btn').addEventListener('click', resetGame);
        document.getElementById('rotate-btn').addEventListener('click', rotateBoard);
        document.getElementById('back-btn').addEventListener('click', undoMove);
    }

    // Start the game
    init();
});