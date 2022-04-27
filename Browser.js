const ROW_NUM = 6
const COL_NUM = 7

new Vue({                   // Grid indexing starts from bottom left cornor (But rows displayed in reverse)
    template: `
        <div>
            <p v-if='myTurn'>Your turn</p>
            <p v-else>Opponent's turn</p>
            <table id='gameboard'>
                <tr v-for='row in board.slice().reverse()'>
                    <td v-for='(value,c) in row' v-on:click='makeMove' v-on:mouseover='highlightCol'
                    v-on:mouseleave='resetColor' v-bind:style="{'background-color': hoverColors[c]}">{{value}}</td>
                </tr>
            </table>
            <p>{{infoMsg}}</p>
            <button v-if='gameEnded' v-on:click='restartGame'>Restart Game</button>
        </div>
    `,
    data: {
        board: [],              // stores the entire game state
        hoverColors: [],        // stores the highlight color of each cell
        myPiece: '',            // piece assigned to this player. Player 1: X. Player 2: O.
        oppPiece: '',           // piece assigned to opponent player.
        infoMsg: '',            // infoMsg displayed at bottom of board
        gameStarted: false,
        gameEnded: false,
        myTurn: false,
        ws: new WebSocket('ws://localhost:5000')
    },
    methods: {
        sendChoice(col) {
            this.ws.send(JSON.stringify(col))
        },
        
        // The reactive version of doing board[row][col] = pieceColor
        updateBoard(board, row, col, piece) {
            let newRow = board[row].slice(0)
            newRow[col] = piece
            this.$set(board, row, newRow)
        },

        // Adds the piece on the board and returns the row and column where its added
        addPieceOnBoard(board, col, piece) {
            // Finding the next empty space in column to fit new piece in 
            for (let i = 0; i < ROW_NUM; i++) {
                if (board[i][col] === ' ') {
                    this.updateBoard(board, i, col, piece)
                    return [i, col]
                }
            }
        },

        // Event called every time user clicks on the board
        makeMove(event) {
            if (!this.gameStarted || this.gameEnded) {
                return
            }
            if (!this.myTurn) {
                this.infoMsg = 'Please wait for your turn.'
                return
            }
            this.infoMsg = ''

            let col = event.target.cellIndex
            console.log('My choice of col: ', col)
            if (this.board[ROW_NUM-1][col] !== ' ') {   // If no more space left in that column
                this.infoMsg = 'No more space left. Choose another column.'
            } else {
                let myChoicePos = this.addPieceOnBoard(this.board, col, this.myPiece)
                this.myTurn = false
                if (check4Connected(this.board, this.myPiece)) {       // if player wins ...
                    myChoicePos.push('Win')                     // ... send win signal along as well
                    console.log('You won!')
                    this.infoMsg = 'You WON!'
                    this.gameEnded = true
                }
                this.sendChoice(myChoicePos)    // sending both row and col for easier debugging
            }
        },

        // Resets the background color of the board cells to white
        resetColor() {
            for (let c = 0; c < COL_NUM; c++) {
                this.$set(this.hoverColors, c, 'white')   // Resetting all colors to white
            }
        },

        // Event called upon mouse hovering over cell. Highlights the cell based on future opponent move
        highlightCol(event) {
            let col = event.target.cellIndex
            let tempBoard1 = JSON.parse(JSON.stringify(this.board))     // taking updated copy of board
            this.addPieceOnBoard(tempBoard1, col, this.myPiece)
            for (let c = 0; c < COL_NUM; c++) {
                let tempBoard2 = JSON.parse(JSON.stringify(tempBoard1))
                this.addPieceOnBoard(tempBoard2, c, this.oppPiece)
                if (check4Connected(tempBoard2, this.oppPiece)) {
                    this.$set(this.hoverColors, col, 'lightcoral')
                    return
                }
            }
            this.$set(this.hoverColors, col, 'palegreen')
        },

        // Restarts game by resetting the entire board (both this and opponent's)
        restartGame() {
            this.board = Array(ROW_NUM).fill().map(() => Array(COL_NUM).fill(' '));     // resetting the board
            this.gameEnded = false
            this.sendChoice('Reset')        // asking opponent to reset its board
            this.infoMsg = 'Game restarted'
        }
    },

    created() {
        this.board = Array(ROW_NUM).fill().map(() => Array(COL_NUM).fill(' '));
        this.hoverColors = Array(ROW_NUM).fill('white');
    },
    mounted() {
        this.ws.onmessage = async event => {
            if (!this.gameStarted) {
                if (event.data === '1') {         // If this is player 1
                    console.log('Connected with Server.\nYou are player 1. Waiting for player 2...')
                    this.myPiece = 'X'     // player 1 assigned color 'X'
                    this.oppPiece = 'O'
                    this.myTurn = true
                    this.infoMsg = 'Waiting for other player...'
                }
                else if (event.data === '2') {         // If this is player 2
                    console.log('Connected with Server.\nYou are player 2.')
                    this.myPiece = 'O'     // player 2 assigned color 'O'
                    this.oppPiece = 'X'
                    this.myTurn = false
                }
                else if (event.data === '3') {    // 3 is indication from server to start game
                    console.log('Starting Game.')
                    this.gameStarted = true
                    this.infoMsg = ''
                }
            } else {            // If game started
                const message = await event.data.text()
                console.groupCollapsed('Server message')
                console.log('MESSAGE RECEIVED FROM SERVER:')
                const oppMsg = JSON.parse(await event.data.text())
                console.log(oppMsg);
                if (oppMsg === 'Reset') {
                    console.log('Restart game request received')
                    this.board = Array(ROW_NUM).fill().map(() => Array(COL_NUM).fill(' '));
                    this.gameEnded = false
                    this.infoMsg = 'Game restarted by opponent'
                } else {            // continue to receive opponents choices
                    this.infoMsg = ''
                    console.log('Opponent choice of col: ', oppMsg[1])
                    this.addPieceOnBoard(this.board, oppMsg[1], this.oppPiece)
                    this.myTurn = true
                    if (oppMsg[oppMsg.length-1] === 'Win') {        // if opponent won
                        console.log('You lost!')
                        this.infoMsg = 'You lost! Better luck next time.'
                        this.gameEnded = true
                    }
                }
                console.groupEnd()
            }
        }
    }

}).$mount('#game')

// Checks if the 4 pieces are connected on the board
const check4Connected = (board, piece) => {
    // checking vertically
    for (let r = 0; r < ROW_NUM-3; r++) {
        for (let c = 0; c < COL_NUM; c++) {
            if (board[r][c] === piece && board[r+1][c] === piece &&
                board[r+2][c] === piece && board[r+3][c] === piece){
                return true;
            }
        }
    }
    //checking horizontally
    for (let r = 0; r < ROW_NUM; r++) {
        for (let c = 0; c < COL_NUM-3; c++) {
            if (board[r][c] === piece && board[r][c+1] === piece &&
                board[r][c+2] === piece && board[r][c+3] === piece){
                return true;
            }
        }
    }
    // checking diagonally down way
    for (let i = 3; i < ROW_NUM; i++){
        for (let j = 0; j < COL_NUM-3; j++){
            if (board[i][j] === piece && board[i-1][j+1] === piece && 
                board[i-2][j+2] === piece && board[i-3][j+3] === piece)
                return true;
        }
    }
    // checking diagonally up way
    for (let i = 3; i < ROW_NUM; i++){
        for (let j = 3; j < COL_NUM; j++){
            if (board[i][j] === piece && board[i-1][j-1] === piece &&
                board[i-2][j-2] === piece && board[i-3][j-3] === piece)
                return true;
        }
    }
    return false;
}

