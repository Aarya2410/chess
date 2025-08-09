document.addEventListener('DOMContentLoaded', () => {
    const gameState = {
        board: [],
        currentPlayer: 'white',
        selectedPiece: null,
        moveHistory: [],
        capturedPieces: { white: [], black: [] },
        isFlipped: false,
        pendingPromotion: null
    };

    const pieces = {
        white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
        black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };

    function initializeBoard() {
        const board = Array(8).fill().map(() => Array(8).fill(null));
        for (let i = 0; i < 8; i++) {
            board[1][i] = { type: 'pawn', color: 'black', symbol: pieces.black.pawn };
            board[6][i] = { type: 'pawn', color: 'white', symbol: pieces.white.pawn };
        }
        const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let i = 0; i < 8; i++) {
            board[0][i] = { type: backRow[i], color: 'black', symbol: pieces.black[backRow[i]] };
            board[7][i] = { type: backRow[i], color: 'white', symbol: pieces.white[backRow[i]] };
        }
        return board;
    }

    function renderBoard() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';

        // Create array to hold squares for proper ordering
        const squares = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');

                // Calculate display positions for visual layout
                const visualRow = gameState.isFlipped ? 7 - r : r;
                const visualCol = gameState.isFlipped ? 7 - c : c;

                square.classList.add('square', (r + c) % 2 === 0 ? 'light' : 'dark');

                // Store the actual board coordinates for game logic
                square.dataset.boardRow = r;
                square.dataset.boardCol = c;

                const piece = gameState.board[r][c];
                if (piece) {
                    square.textContent = piece.symbol;
                    square.classList.add(piece.color + '-piece');
                }

                square.addEventListener('click', handleSquareClick);

                // Store square with its visual position for proper ordering
                squares.push({ square, visualRow, visualCol });
            }
        }

        // Sort squares by visual position and append to DOM
        squares
            .sort((a, b) => {
                if (a.visualRow !== b.visualRow) return a.visualRow - b.visualRow;
                return a.visualCol - b.visualCol;
            })
            .forEach(({ square }) => chessboard.appendChild(square));

        updateCapturedPieces();
        updateTurnIndicator();
        updateMoveHistory();
    }

    function handleSquareClick(e) {
        if (gameState.pendingPromotion) return;
        // Use the actual board coordinates stored in data attributes
        const row = parseInt(e.target.dataset.boardRow);
        const col = parseInt(e.target.dataset.boardCol);

        if (gameState.selectedPiece) {
            const { row: sr, col: sc } = gameState.selectedPiece;
            if (isValidMove(sr, sc, row, col)) {
                movePiece(sr, sc, row, col);
                clearHighlights();
                gameState.selectedPiece = null;
            } else {
                clearHighlights();
                if (gameState.board[row][col] && gameState.board[row][col].color === gameState.currentPlayer) {
                    selectPiece(row, col);
                } else {
                    gameState.selectedPiece = null;
                }
            }
        } else if (gameState.board[row][col] && gameState.board[row][col].color === gameState.currentPlayer) {
            selectPiece(row, col);
        }
    }

    function selectPiece(row, col) {
        gameState.selectedPiece = { row, col };
        clearHighlights();
        // Find the square using the actual board coordinates
        const square = document.querySelector(`.square[data-board-row="${row}"][data-board-col="${col}"]`);
        square.classList.add('selected');
        highlightValidMoves(row, col);
    }

    function clearHighlights() {
        document.querySelectorAll('.square').forEach(sq =>
            sq.classList.remove('selected', 'valid-move', 'valid-capture')
        );
    }

    function highlightValidMoves(row, col) {
        getPossibleMoves(row, col, gameState.board[row][col]).forEach(move => {
            // Find the square using the actual board coordinates
            const sq = document.querySelector(
                `.square[data-board-row="${move.row}"][data-board-col="${move.col}"]`
            );
            if (gameState.board[move.row][move.col]) {
                sq.classList.add('valid-capture');
            } else {
                sq.classList.add('valid-move');
            }
        });
    }

    function isValidMove(fr, fc, tr, tc) {
        return getPossibleMoves(fr, fc, gameState.board[fr][fc])
            .some(m => m.row === tr && m.col === tc);
    }

    function getPossibleMoves(row, col, piece) {
        if (!piece) return [];
        const moves = [];
        const dir = piece.color === 'white' ? -1 : 1;

        if (piece.type === 'pawn') {
            if (isEmpty(row + dir, col)) {
                moves.push({ row: row + dir, col });
                if ((piece.color === 'white' && row === 6) || (piece.color === 'black' && row === 1)) {
                    if (isEmpty(row + 2 * dir, col)) {
                        moves.push({ row: row + 2 * dir, col });
                    }
                }
            }
            [-1, 1].forEach(dc => {
                if (isEnemy(row + dir, col + dc, piece.color)) {
                    moves.push({ row: row + dir, col: col + dc });
                }
            });
        }

        const dirs = {
            rook: [[-1, 0], [1, 0], [0, -1], [0, 1]],
            bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
            queen: [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]],
            king: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
            knight: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
        };

        if (piece.type !== 'pawn') {
            const steps = dirs[piece.type] || [];
            for (const [dr, dc] of steps) {
                let r = row + dr, c = col + dc;
                while (isValid(r, c)) {
                    if (isEmpty(r, c)) {
                        moves.push({ row: r, col: c });
                    } else {
                        if (isEnemy(r, c, piece.color)) {
                            moves.push({ row: r, col: c });
                        }
                        break;
                    }
                    if (['king', 'knight'].includes(piece.type)) break;
                    r += dr;
                    c += dc;
                }
            }
        }
        return moves;
    }

    const isValid = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
    const isEmpty = (r, c) => isValid(r, c) && !gameState.board[r][c];
    const isEnemy = (r, c, color) => isValid(r, c) && gameState.board[r][c] && gameState.board[r][c].color !== color;

    function movePiece(fr, fc, tr, tc) {
        const piece = gameState.board[fr][fc];
        const captured = gameState.board[tr][tc];
        if (captured) gameState.capturedPieces[captured.color].push(captured);

        if (piece.type === 'pawn' && (tr === 0 || tr === 7)) {
            gameState.pendingPromotion = { piece, from: { row: fr, col: fc }, to: { row: tr, col: tc }, captured };
            document.getElementById('promotion-modal').style.display = 'flex';
            return;
        }

        gameState.board[tr][tc] = piece;
        gameState.board[fr][fc] = null;
        gameState.moveHistory.push({ piece, from: { row: fr, col: fc }, to: { row: tr, col: tc }, captured });
        gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
        renderBoard();
    }

    document.querySelectorAll('.promotion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const { piece, from, to, captured } = gameState.pendingPromotion;
            const newPiece = {
                type: btn.dataset.piece,
                color: piece.color,
                symbol: pieces[piece.color][btn.dataset.piece]
            };
            gameState.board[to.row][to.col] = newPiece;
            gameState.board[from.row][from.col] = null;
            if (captured) gameState.capturedPieces[captured.color].push(captured);
            gameState.moveHistory.push({ piece: newPiece, from, to, captured, promotion: true });
            gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
            gameState.pendingPromotion = null;
            document.getElementById('promotion-modal').style.display = 'none';
            renderBoard();
        });
    });

    function updateCapturedPieces() {
        ['white', 'black'].forEach(color => {
            const container = document.getElementById(
                color === 'white' ? 'captured-pieces-top' : 'captured-pieces-bottom'
            );
            container.innerHTML = '';
            gameState.capturedPieces[color].forEach(p => {
                const el = document.createElement('div');
                el.textContent = p.symbol;
                el.classList.add('captured-piece', color + '-piece');
                container.appendChild(el);
            });
        });
    }

    function updateTurnIndicator() {
        document.getElementById('current-turn').textContent =
            `${gameState.currentPlayer[0].toUpperCase() + gameState.currentPlayer.slice(1)} to move`;
    }

    function updateMoveHistory() {
        const list = document.getElementById('move-list');
        list.innerHTML = '';

        for (let i = 0; i < gameState.moveHistory.length; i += 2) {
            const whiteMove = gameState.moveHistory[i];
            const blackMove = gameState.moveHistory[i + 1];

            const pairDiv = document.createElement('div');
            pairDiv.classList.add('move-pair');

            const moveNumber = Math.floor(i / 2) + 1;

            const numberSpan = document.createElement('span');
            numberSpan.classList.add('move-number');
            numberSpan.textContent = `${moveNumber}.`;

            const whiteSpan = document.createElement('span');
            whiteSpan.classList.add('white-move');
            const whitePieceLetter = whiteMove.piece.type === 'pawn' ? '' : whiteMove.piece.type[0].toUpperCase();
            const whiteCapture = whiteMove.captured ? 'x' : '';
            const whiteCol = String.fromCharCode(97 + whiteMove.to.col);
            const whiteRow = 8 - whiteMove.to.row;
            const whitePromo = whiteMove.promotion ? `=${whiteMove.piece.type[0].toUpperCase()}` : '';
            whiteSpan.textContent = `${whitePieceLetter}${whiteCapture}${whiteCol}${whiteRow}${whitePromo}`;

            const blackSpan = document.createElement('span');
            blackSpan.classList.add('black-move');
            if (blackMove) {
                const blackPieceLetter = blackMove.piece.type === 'pawn' ? '' : blackMove.piece.type[0].toUpperCase();
                const blackCapture = blackMove.captured ? 'x' : '';
                const blackCol = String.fromCharCode(97 + blackMove.to.col);
                const blackRow = 8 - blackMove.to.row;
                const blackPromo = blackMove.promotion ? `=${blackMove.piece.type[0].toUpperCase()}` : '';
                blackSpan.textContent = `${blackPieceLetter}${blackCapture}${blackCol}${blackRow}${blackPromo}`;
            }

            pairDiv.appendChild(numberSpan);
            pairDiv.appendChild(whiteSpan);
            pairDiv.appendChild(blackSpan);

            list.appendChild(pairDiv);
        }
    }

    document.getElementById('rotate-btn').addEventListener('click', () => {
        gameState.isFlipped = !gameState.isFlipped;
        renderBoard();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        if (confirm('Reset game?')) init();
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        if (!gameState.moveHistory.length) return;
        const last = gameState.moveHistory.pop();
        gameState.board[last.from.row][last.from.col] = last.piece;
        gameState.board[last.to.row][last.to.col] = last.captured || null;
        if (last.captured) {
            const arr = gameState.capturedPieces[last.captured.color];
            arr.splice(arr.lastIndexOf(last.captured), 1);
        }
        gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
        renderBoard();
    });

    function init() {
        gameState.board = initializeBoard();
        gameState.currentPlayer = 'white';
        gameState.selectedPiece = null;
        gameState.moveHistory = [];
        gameState.capturedPieces = { white: [], black: [] };
        gameState.isFlipped = false;
        gameState.pendingPromotion = null;
        renderBoard();
    }

    init();
});