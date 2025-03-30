import React, { useState, useEffect } from 'react';
import './Chessboard.css';

const initialBoard = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

const pieceSymbols = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

const Chessboard = () => {
  const [board, setBoard] = useState(initialBoard);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [turn, setTurn] = useState('white');
  const [winner, setWinner] = useState(null);
  const [castling, setCastling] = useState({
    whiteKingMoved: false,
    blackKingMoved: false,
    whiteRookA: false,
    whiteRookH: false,
    blackRookA: false,
    blackRookH: false
  });
  const [promotion, setPromotion] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [checkStatus, setCheckStatus] = useState({ white: false, black: false });
  const [moveHistory, setMoveHistory] = useState([]); // For undo/redo
  const [futureMoves, setFutureMoves] = useState([]); // For redo
  const [timer, setTimer] = useState(null); // Timer in seconds

  const isWhitePiece = (piece) => piece && piece === piece.toUpperCase();

  const isPathClear = (fromRow, fromCol, toRow, toCol, tempBoard = board) => {
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    let row = fromRow + rowStep;
    let col = fromCol + colStep;

    while (row !== toRow || col !== toCol) {
      if (tempBoard[row][col]) return false;
      row += rowStep;
      col += colStep;
    }
    return true;
  };

  const canPieceAttack = (fromRow, fromCol, toRow, toCol, piece, tempBoard = board) => {
    const target = tempBoard[toRow][toCol];
    const isWhite = isWhitePiece(piece);
    if (target && (isWhite === isWhitePiece(target))) return false;

    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    switch (piece.toLowerCase()) {
      case 'p':
        const direction = isWhite ? -1 : 1;
        return colDiff === 1 && toRow === fromRow + direction;
      case 'r':
        return (rowDiff === 0 || colDiff === 0) && isPathClear(fromRow, fromCol, toRow, toCol, tempBoard);
      case 'n':
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
      case 'b':
        return rowDiff === colDiff && isPathClear(fromRow, fromCol, toRow, toCol, tempBoard);
      case 'q':
        return (rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) && 
               isPathClear(fromRow, fromCol, toRow, toCol, tempBoard);
      case 'k':
        return rowDiff <= 1 && colDiff <= 1;
      default:
        return false;
    }
  };

  const isKingInCheck = (isWhite, tempBoard = board) => {
    const king = isWhite ? 'K' : 'k';
    let kingRow, kingCol;
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (tempBoard[i][j] === king) {
          kingRow = i;
          kingCol = j;
          break;
        }
      }
      if (kingRow !== undefined) break;
    }

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = tempBoard[i][j];
        if (piece && isWhitePiece(piece) !== isWhite) {
          if (canPieceAttack(i, j, kingRow, kingCol, piece, tempBoard)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const isValidMove = (fromRow, fromCol, toRow, toCol) => {
    const piece = board[fromRow][fromCol];
    const target = board[toRow][toCol];
    const isWhite = isWhitePiece(piece);
    if ((turn === 'white' && !isWhite) || (turn === 'black' && isWhite)) return false;
    if (target && (isWhite === isWhitePiece(target))) return false;

    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    const tempBoard = board.map(row => [...row]);
    tempBoard[toRow][toCol] = piece;
    tempBoard[fromRow][fromCol] = '';

    if (isKingInCheck(isWhite, tempBoard)) return false;

    switch (piece.toLowerCase()) {
      case 'p':
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        const enPassantRow = isWhite ? 3 : 4;

        if (colDiff === 0 && !target) {
          if (toRow === fromRow + direction) return true;
          if (fromRow === startRow && toRow === fromRow + 2 * direction && !board[fromRow + direction][fromCol]) return true;
        }
        if (colDiff === 1 && toRow === fromRow + direction && target) return true;
        if (colDiff === 1 && toRow === fromRow + direction && !target && fromRow === enPassantRow) {
          if (lastMove && 
              lastMove.piece.toLowerCase() === 'p' && 
              Math.abs(lastMove.fromRow - lastMove.toRow) === 2 && 
              lastMove.toCol === toCol && 
              lastMove.toRow === fromRow) {
            tempBoard[fromRow][toCol] = '';
            return !isKingInCheck(isWhite, tempBoard);
          }
        }
        return false;

      case 'r':
        return (rowDiff === 0 || colDiff === 0) && isPathClear(fromRow, fromCol, toRow, toCol);

      case 'n':
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

      case 'b':
        return rowDiff === colDiff && isPathClear(fromRow, fromCol, toRow, toCol);

      case 'q':
        return (rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) && isPathClear(fromRow, fromCol, toRow, toCol);

      case 'k':
        if (rowDiff === 0 && colDiff === 2) {
          if (isWhite && !castling.whiteKingMoved && fromRow === 7 && fromCol === 4) {
            if (toCol === 6 && !castling.whiteRookH && !board[7][5] && !board[7][6]) {
              return isPathClear(7, 4, 7, 7) && !isKingInCheck(true);
            }
            if (toCol === 2 && !castling.whiteRookA && !board[7][1] && !board[7][2] && !board[7][3]) {
              return isPathClear(7, 4, 7, 0) && !isKingInCheck(true);
            }
          }
          if (!isWhite && !castling.blackKingMoved && fromRow === 0 && fromCol === 4) {
            if (toCol === 6 && !castling.blackRookH && !board[0][5] && !board[0][6]) {
              return isPathClear(0, 4, 0, 7) && !isKingInCheck(false);
            }
            if (toCol === 2 && !castling.blackRookA && !board[0][1] && !board[0][2] && !board[0][3]) {
              return isPathClear(0, 4, 0, 0) && !isKingInCheck(false);
            }
          }
        }
        return rowDiff <= 1 && colDiff <= 1;

      default:
        return false;
    }
  };

  const checkForWinner = (newBoard) => {
    const whiteKingPresent = newBoard.some(row => row.includes('K'));
    const blackKingPresent = newBoard.some(row => row.includes('k'));
    if (!whiteKingPresent) return 'Black';
    if (!blackKingPresent) return 'White';
    return null;
  };

  const updateCheckStatus = (newBoard) => {
    const whiteCheck = isKingInCheck(true, newBoard);
    const blackCheck = isKingInCheck(false, newBoard);
    setCheckStatus({ white: whiteCheck, black: blackCheck });

    // Start timer if a king is in check
    if ((whiteCheck || blackCheck) && !winner && !timer) {
      setTimer(15);
    } else if (!whiteCheck && !blackCheck) {
      setTimer(null);
    }
  };

  useEffect(() => {
    let interval;
    if (timer !== null && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      // Timer ran out, declare winner based on who checked the opponent
      if (checkStatus.white && !checkStatus.black) {
        setWinner('Black');
      } else if (checkStatus.black && !checkStatus.white) {
        setWinner('White');
      }
      setTimer(null);
    }
    return () => clearInterval(interval);
  }, [timer, checkStatus]);

  const saveState = () => {
    return {
      board: board.map(row => [...row]),
      turn,
      castling: { ...castling },
      lastMove: lastMove ? { ...lastMove } : null,
      checkStatus: { ...checkStatus }
    };
  };

  const handlePromotionChoice = (piece) => {
    const previousState = saveState();
    const newBoard = [...board.map(row => [...row])];
    const { row, col } = promotion;
    newBoard[row][col] = turn === 'white' ? piece.toUpperCase() : piece.toLowerCase();
    setBoard(newBoard);
    setPromotion(null);
    setTurn(turn === 'white' ? 'black' : 'white');
    setLastMove(null);
    setMoveHistory([...moveHistory, previousState]);
    setFutureMoves([]);
    updateCheckStatus(newBoard);
    const gameWinner = checkForWinner(newBoard);
    if (gameWinner) setWinner(gameWinner);
  };

  const handleSquareClick = (row, col) => {
    if (winner || promotion) return;

    if (selectedPiece) {
      const { row: fromRow, col: fromCol } = selectedPiece;
      if (isValidMove(fromRow, fromCol, row, col)) {
        const previousState = saveState();
        const newBoard = [...board.map(row => [...row])];
        const piece = newBoard[fromRow][fromCol];

        if (piece.toLowerCase() === 'k' && Math.abs(fromCol - col) === 2) {
          if (col === 6) {
            newBoard[fromRow][5] = newBoard[fromRow][7];
            newBoard[fromRow][7] = '';
          } else if (col === 2) {
            newBoard[fromRow][3] = newBoard[fromRow][0];
            newBoard[fromRow][0] = '';
          }
        }

        if (piece.toLowerCase() === 'p' && 
            Math.abs(fromCol - col) === 1 && 
            !newBoard[row][col] && 
            lastMove && 
            lastMove.toCol === col && 
            lastMove.toRow === fromRow) {
          newBoard[fromRow][col] = '';
        }

        if (piece.toLowerCase() === 'p' && (row === 0 || row === 7)) {
          newBoard[row][col] = '';
          newBoard[fromRow][fromCol] = '';
          setBoard(newBoard);
          setPromotion({ row, col });
          setLastMove({ piece, fromRow, fromCol, toRow: row, toCol: col });
          setSelectedPiece(null);
          setMoveHistory([...moveHistory, previousState]);
          setFutureMoves([]);
          updateCheckStatus(newBoard);
          return;
        }

        newBoard[row][col] = piece;
        newBoard[fromRow][fromCol] = '';
        
        setLastMove({ piece, fromRow, fromCol, toRow: row, toCol: col });
        setBoard(newBoard);
        setTurn(turn === 'white' ? 'black' : 'white');

        if (piece === 'K') setCastling({...castling, whiteKingMoved: true});
        if (piece === 'k') setCastling({...castling, blackKingMoved: true});
        if (piece === 'R' && fromRow === 7 && fromCol === 0) setCastling({...castling, whiteRookA: true});
        if (piece === 'R' && fromRow === 7 && fromCol === 7) setCastling({...castling, whiteRookH: true});
        if (piece === 'r' && fromRow === 0 && fromCol === 0) setCastling({...castling, blackRookA: true});
        if (piece === 'r' && fromRow === 0 && fromCol === 7) setCastling({...castling, blackRookH: true});

        setMoveHistory([...moveHistory, previousState]);
        setFutureMoves([]);
        updateCheckStatus(newBoard);
        const gameWinner = checkForWinner(newBoard);
        if (gameWinner) setWinner(gameWinner);
      }
      setSelectedPiece(null);
    } else if (board[row][col]) {
      setSelectedPiece({ row, col });
    }
  };

  const handleUndo = () => {
    if (moveHistory.length === 0 || winner) return;
    const previousState = moveHistory[moveHistory.length - 1];
    const newFutureMoves = [saveState(), ...futureMoves];
    setBoard(previousState.board);
    setTurn(previousState.turn);
    setCastling(previousState.castling);
    setLastMove(previousState.lastMove);
    setCheckStatus(previousState.checkStatus);
    setMoveHistory(moveHistory.slice(0, -1));
    setFutureMoves(newFutureMoves);
    setTimer(null); // Reset timer on undo
    setWinner(null); // Reset winner on undo
  };

  const handleRedo = () => {
    if (futureMoves.length === 0 || winner) return;
    const nextState = futureMoves[0];
    const newMoveHistory = [...moveHistory, saveState()];
    setBoard(nextState.board);
    setTurn(nextState.turn);
    setCastling(nextState.castling);
    setLastMove(nextState.lastMove);
    setCheckStatus(nextState.checkStatus);
    setMoveHistory(newMoveHistory);
    setFutureMoves(futureMoves.slice(1));
    updateCheckStatus(nextState.board); // Recheck status after redo
  };

  const resetGame = () => {
    setBoard(initialBoard);
    setSelectedPiece(null);
    setTurn('white');
    setWinner(null);
    setCastling({
      whiteKingMoved: false,
      blackKingMoved: false,
      whiteRookA: false,
      whiteRookH: false,
      blackRookA: false,
      blackRookH: false
    });
    setPromotion(null);
    setLastMove(null);
    setCheckStatus({ white: false, black: false });
    setMoveHistory([]);
    setFutureMoves([]);
    setTimer(null);
  };

  return (
    <div className="chessboard-container">
      <div className="chessboard">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const isLightSquare = (rowIndex + colIndex) % 2 === 0;
            const isSelected = selectedPiece && 
              selectedPiece.row === rowIndex && 
              selectedPiece.col === colIndex;
            const isKingInCheck = (piece === 'K' && checkStatus.white) || 
                                 (piece === 'k' && checkStatus.black);

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`square ${isLightSquare ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isKingInCheck ? 'check' : ''}`}
                onClick={() => handleSquareClick(rowIndex, colIndex)}
              >
                <span className={`piece ${piece.toLowerCase() === piece ? 'black' : 'white'}`}>
                  {pieceSymbols[piece] || ''}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="game-info">
        {promotion ? (
          <div className="promotion-choices">
            <span>Promote pawn to:</span>
            {['q', 'r', 'b', 'n'].map(piece => (
              <button
                key={piece}
                onClick={() => handlePromotionChoice(piece)}
              >
                {pieceSymbols[turn === 'white' ? piece.toUpperCase() : piece]}
              </button>
            ))}
          </div>
        ) : winner ? (
          <div className="winner-message">
            <span>{winner} Wins!</span>
            <button className="reset-button" onClick={resetGame}>Play Again</button>
          </div>
        ) : (
          <div className="turn-indicator">
            <div>Turn: {turn.charAt(0).toUpperCase() + turn.slice(1)}</div>
            {checkStatus.white && <div className="checks-warning">White King is in Check!</div>}
            {checkStatus.black && <div className="checks-warning">Black King is in Check!</div>}
            {(checkStatus.white || checkStatus.black) && timer !== null && (
              <div className="timer">Time to Move: {timer}s</div>
            )}
            <div className="controls">
              <button onClick={handleUndo} disabled={moveHistory.length === 0}>Undo</button>
              <button onClick={handleRedo} disabled={futureMoves.length === 0}>Redo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chessboard;