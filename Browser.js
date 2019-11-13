/**     Assignment 3: Connect 4 Game (BROWSER SIDE)
 *              @author Nouman Abbasi
*/



new Vue({                   // Grid indexing starts from bottom left cornor (But rows displayed in reverse)
    template: `
        <div>
            <table id='gameboard'>
                <tr v-for='row in board.slice().reverse()'>
                    <td v-for='value in row' v-on:click='makeMove'>{{value}}</td>
                </tr>
            </table>
            <p>{{colChoice}}</p>
            <p>{{infoMsg}}</p>
        </div>
    `,
    data: {                             // TODO Removing colChoice from template causes no updates to 2d array
        ROW_NUM: 6,
        COL_NUM: 7,
        colChoice: -1,
        myChoicePos: [],       // stores the position at where the new piece is placed
        oppChoicePos: [],
        myPieceColor: 'X',      // color of piece assigned to this user by the server. Player 1: X. Player 2: O.
        board: [],
        infoMsg: '',
        startGame: false,
        myTurn: false,
        ws: new WebSocket('ws://localhost:5000')
    },
    methods: {
        async sendChoice() {
            this.ws.send(JSON.stringify(this.myChoicePos))
        },

        makeMove(event) {
            this.infoMsg = ''
            if (!this.startGame || !this.myTurn) {
                infoMsg = 'Please wait for your turn.'
                return;
            }

            this.colChoice = event.target.cellIndex
            let column = event.target.cellIndex
            console.log(column)
            if (this.board[this.ROW_NUM-1][column] !== ' ') {   // If no more space left in that column
                this.infoMsg = 'No more space left. Choose another column.'
            } else {
                // Finding the next empty space to add the piece
                for (let i = 0; i < this.ROW_NUM; i++) {
                    if (this.board[i][column] === ' ') {
                        this.board[i][column] = this.myPieceColor
                        this.myChoicePos = [i, column]
                        break
                    }
                }
                this.colChoice = -1
                this.myTurn = false
                this.sendChoice(this.myChoicePos)
            }
        },

    },
    created() {
        this.board  = Array(this.ROW_NUM).fill().map(() => Array(this.COL_NUM).fill(' '));
        this.board = Array(this.ROW_NUM).fill().map(() => Array(this.COL_NUM).fill(' '));
    },
    mounted() {
        this.ws.onmessage = event => {
            if (!this.startGame) {
                if (event.data === '1') {         // If this is player 1
                    console.log('Connected with Server.\nYou are player 1. Waiting for player 2...')
                    this.myPieceColor = 'X'     // player 1 assigned color 'X'
                    this.myTurn = true
                }
                else if (event.data === '2') {         // If this is player 2
                    console.log('Connected with Server.\nYou are player 2.')
                    this.myPieceColor = 'O'     // player 2 assigned color 'O'
                    this.myTurn = false
                }
                else if (event.data === '3') {    // 3 is indication from server to start game
                    console.log('Starting Game.')
                    this.startGame = true
                }
            } else {            // If game started
                // Now game has started, we recieve positions of opponent player
                if (event.data === 'Won') {
                    console.log('You won!')
                    this.infoMsg = 'You WON!'
                } else if (event.data === 'Lost') {
                    console.log('You lost!')
                    this.infoMsg = 'You lost! Better luck next time.'
                } else {
                    let [oppRow, oppCol] = JSON.parse(event.data)
                    console.log('Opponent choice received', oppRow, oppCol)
                    if (this.myPieceColor === 'X')
                        this.board[oppRow][oppCol] = 'O'
                    else
                        this.board[oppRow][oppCol] = 'X'
                    this.myTurn = true
                    // oppChoicePos = []
                }
            }
        }
    }

}).$mount('#game')

