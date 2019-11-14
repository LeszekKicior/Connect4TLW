/**     Assignment 3: Connect 4 Game (BROWSER SIDE)
 *              @author Nouman Abbasi
*/



new Vue({                   // Grid indexing starts from bottom left cornor (But rows displayed in reverse)
    template: `
        <div>
            <p v-if='myTurn'>Your turn</p>
            <p v-else>Opponent's turn</p>
            <table id='gameboard'>
                <tr v-for='row in board.slice().reverse()'>
                    <td v-for='value in row' v-on:click='makeMove'>{{value}}</td>
                </tr>
            </table>
            <p>{{infoMsg}}</p>
        </div>
    `,
    data: {                             // TODO Removing colChoice from template causes no updates to 2d array
        ROW_NUM: 6,
        COL_NUM: 7,
        colChoice: -1,
        myChoicePos: [],        // stores the position at where the new piece is placed
        oppChoicePos: [],
        myPiece: '',      // color of piece assigned to this user by the server. Player 1: X. Player 2: O.
        oppPiece: '',
        board: [],
        boardTest: [],          // this board is used for trying out next opponent moves for highlighting columns 
        infoMsg: '',
        gameStarted: false,
        gameEnded: false,
        myTurn: false,
        ws: new WebSocket('ws://localhost:5000')
    },
    methods: {
        async sendChoice(col) {
            this.ws.send(JSON.stringify(col))
        },
        
        updateBoard(board, row, col, piece) {   // the reactive version of doing board[i][col] = pieceColor
            let newRow = board[row].slice(0)
            newRow[col] = piece
            this.$set(board, row, newRow)
        },

        addPieceOnBoard(board, col, piece) {
            // Finding the next empty space in column to fit new piece in 
            for (let i = 0; i < this.ROW_NUM; i++) {
                if (this.board[i][col] === ' ') {
                    this.updateBoard(board, i, col, piece)
                    return [i, col]
                }
            }
        },

        makeMove(event) {
            this.infoMsg = ''
            if (!this.gameStarted || this.gameEnded) {
                return
            }
            if (!this.myTurn) {
                this.infoMsg = 'Please wait for your turn.'
                return
            }

            // this.colChoice = event.target.cellIndex
            let col = event.target.cellIndex
            console.log('My choice of col: ', col)
            if (this.board[this.ROW_NUM-1][col] !== ' ') {   // If no more space left in that column
                this.infoMsg = 'No more space left. Choose another column.'
            } else {
                this.myChoicePos = this.addPieceOnBoard(this.board, col, this.myPiece)
                this.myTurn = false
                this.sendChoice(this.myChoicePos)
            }
        },

    },

    testMove(event) {
        let col = event.target.cellIndex
        let boardTest = JSON.parse(JSON.stringify(this.board))     // taking updated copy of board
        addPieceOnBoard(boardTest, col, this.myPiece)
    },

    created() {
        this.board  = Array(this.ROW_NUM).fill().map(() => Array(this.COL_NUM).fill(' '));
        this.board = Array(this.ROW_NUM).fill().map(() => Array(this.COL_NUM).fill(' '));
    },
    mounted() {
        this.ws.onmessage = event => {
            if (!this.gameStarted) {
                if (event.data === '1') {         // If this is player 1
                    console.log('Connected with Server.\nYou are player 1. Waiting for player 2...')
                    this.myPiece = 'X'     // player 1 assigned color 'X'
                    this.oppPiece = 'O'
                    this.myTurn = true
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
                }
            } else {            // If game started
                // Now game has started, we recieve positions of opponent player
                if (event.data === 'Won') {
                    console.log('You won!')
                    this.infoMsg = 'You WON!'
                    this.gameEnded = true
                } else if (event.data === 'Lost') {
                    console.log('You lost!')
                    this.infoMsg = 'You lost! Better luck next time.'
                    this.gameEnded = true
                } else {
                    this.infoMsg = ''
                    let [oppRow, oppCol] = JSON.parse(event.data)
                    console.log('Opponent choice of col: ', oppCol)
                    this.addPieceOnBoard(this.board, oppCol, this.oppPiece)
                    this.myTurn = true
                }
            }
        }
    }

}).$mount('#game')

