class OthelloGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'black'; // 'black' or 'white'
        this.gameOver = false;
        this.showHints = false;
        this.BOARD_SIZE = 8;
        this.DIRECTIONS = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        this.initGame();
        this.attachEventListeners();
    }

    initGame() {
        this.createBoard();
        this.initBoard();
        this.renderBoard();
        this.updateUI();
    }

    createBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => this.handleCellClick(row, col));
                boardElement.appendChild(cell);
            }
        }
    }

    initBoard() {
        // ボードを空で初期化
        this.board = Array(this.BOARD_SIZE).fill(null).map(() =>
            Array(this.BOARD_SIZE).fill(null)
        );

        // 初期配置（中央に4つの石）
        const mid = this.BOARD_SIZE / 2;
        this.board[mid - 1][mid - 1] = 'white';
        this.board[mid - 1][mid] = 'black';
        this.board[mid][mid - 1] = 'black';
        this.board[mid][mid] = 'white';

        this.currentPlayer = 'black';
        this.gameOver = false;
    }

    renderBoard() {
        const boardElement = document.getElementById('board');
        const cells = boardElement.getElementsByClassName('cell');

        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                const index = row * this.BOARD_SIZE + col;
                const cell = cells[index];
                const disc = this.board[row][col];

                // 既存の石を削除
                cell.innerHTML = '';

                // 石があれば表示
                if (disc) {
                    const discElement = document.createElement('div');
                    discElement.className = `disc ${disc}`;
                    cell.appendChild(discElement);
                }

                // 合法手のハイライト
                cell.classList.remove('valid-move');
                if (this.showHints && !this.gameOver && !disc && this.isValidMove(row, col, this.currentPlayer)) {
                    cell.classList.add('valid-move');
                }
            }
        }
    }

    isValidMove(row, col, player) {
        if (this.board[row][col] !== null) {
            return false;
        }

        const opponent = player === 'black' ? 'white' : 'black';

        // 8方向をチェック
        for (const [dx, dy] of this.DIRECTIONS) {
            let x = row + dx;
            let y = col + dy;
            let hasOpponent = false;

            // この方向に相手の石があるかチェック
            while (x >= 0 && x < this.BOARD_SIZE && y >= 0 && y < this.BOARD_SIZE) {
                if (this.board[x][y] === opponent) {
                    hasOpponent = true;
                } else if (this.board[x][y] === player && hasOpponent) {
                    return true; // 挟める
                } else {
                    break; // 空白または境界
                }
                x += dx;
                y += dy;
            }
        }

        return false;
    }

    getFlippableDiscs(row, col, player) {
        const flippable = [];
        const opponent = player === 'black' ? 'white' : 'black';

        // 8方向をチェック
        for (const [dx, dy] of this.DIRECTIONS) {
            const temp = [];
            let x = row + dx;
            let y = col + dy;

            // この方向に相手の石を収集
            while (x >= 0 && x < this.BOARD_SIZE && y >= 0 && y < this.BOARD_SIZE) {
                if (this.board[x][y] === opponent) {
                    temp.push([x, y]);
                } else if (this.board[x][y] === player && temp.length > 0) {
                    flippable.push(...temp); // この方向の石を追加
                    break;
                } else {
                    break; // 空白または境界
                }
                x += dx;
                y += dy;
            }
        }

        return flippable;
    }

    makeMove(row, col) {
        if (this.gameOver || this.board[row][col] !== null) {
            return false;
        }

        if (!this.isValidMove(row, col, this.currentPlayer)) {
            return false;
        }

        // 石を置く
        this.board[row][col] = this.currentPlayer;

        // 裏返す石を取得
        const flippable = this.getFlippableDiscs(row, col, this.currentPlayer);

        // 石を裏返す
        for (const [x, y] of flippable) {
            this.board[x][y] = this.currentPlayer;
        }

        // ボードを再描画
        this.renderBoard();

        // ターンを変更
        this.switchPlayer();

        return true;
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';

        // 次のプレイヤーが置ける場所があるかチェック
        if (!this.hasValidMoves(this.currentPlayer)) {
            // 置ける場所がない場合
            const otherPlayer = this.currentPlayer === 'black' ? 'white' : 'black';

            if (!this.hasValidMoves(otherPlayer)) {
                // 両者とも置けない → ゲーム終了
                this.endGame();
            } else {
                // 相手に戻す（パス）
                this.showMessage(`${this.getPlayerName(this.currentPlayer)}はパスです`);
                this.currentPlayer = otherPlayer;
            }
        }

        this.updateUI();
    }

    hasValidMoves(player) {
        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                if (this.isValidMove(row, col, player)) {
                    return true;
                }
            }
        }
        return false;
    }

    handleCellClick(row, col) {
        if (this.gameOver) {
            return;
        }

        if (this.makeMove(row, col)) {
            this.updateUI();
        }
    }

    updateUI() {
        const score = this.getScore();

        // スコア更新
        document.getElementById('blackScore').textContent = score.black;
        document.getElementById('whiteScore').textContent = score.white;

        // ターン表示
        const turnIndicator = document.getElementById('turnIndicator');
        if (!this.gameOver) {
            turnIndicator.textContent = `${this.getPlayerName(this.currentPlayer)}のターン`;
        }

        // プレイヤー情報のアクティブ表示
        document.getElementById('blackPlayer').classList.toggle('active', this.currentPlayer === 'black' && !this.gameOver);
        document.getElementById('whitePlayer').classList.toggle('active', this.currentPlayer === 'white' && !this.gameOver);
    }

    getScore() {
        let black = 0;
        let white = 0;

        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                if (this.board[row][col] === 'black') {
                    black++;
                } else if (this.board[row][col] === 'white') {
                    white++;
                }
            }
        }

        return { black, white };
    }

    getPlayerName(player) {
        return player === 'black' ? '黒' : '白';
    }

    endGame() {
        this.gameOver = true;
        const score = this.getScore();

        let message = '';
        if (score.black > score.white) {
            message = `🎉 黒の勝ち！ (${score.black} - ${score.white})`;
        } else if (score.white > score.black) {
            message = `🎉 白の勝ち！ (${score.white} - ${score.black})`;
        } else {
            message = `🤝 引き分け！ (${score.black} - ${score.white})`;
        }

        this.showMessage(message, true);

        // プレイヤー情報からアクティブ表示を削除
        document.getElementById('blackPlayer').classList.remove('active');
        document.getElementById('whitePlayer').classList.remove('active');
    }

    showMessage(text, isWinner = false) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = text;
        messageElement.classList.toggle('winner', isWinner);

        if (!isWinner) {
            // 一時的なメッセージは3秒後に消す
            setTimeout(() => {
                if (messageElement.textContent === text) {
                    messageElement.textContent = '';
                }
            }, 3000);
        }
    }

    resetGame() {
        this.initBoard();
        this.renderBoard();
        this.updateUI();
        document.getElementById('message').textContent = '';
        document.getElementById('message').classList.remove('winner');
    }

    toggleHints() {
        this.showHints = !this.showHints;
        this.renderBoard();

        const hintBtn = document.getElementById('hintBtn');
        hintBtn.textContent = this.showHints ? 'ヒント非表示' : 'ヒント表示';
    }

    attachEventListeners() {
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('hintBtn').addEventListener('click', () => {
            this.toggleHints();
        });
    }
}

// ゲームを開始
document.addEventListener('DOMContentLoaded', () => {
    new OthelloGame();
});
