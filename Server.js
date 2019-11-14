/**     Assignment 3: Connect 4 Game (SERVER SIDE)
 *              @author Nouman Abbasi
*/

const fs = require('fs')
const http = require('http')
const ws = require('ws')

const ROW_NUM = 6
const COL_NUM = 7

const readFile = file => new Promise(resolve =>
    fs.readFile(file, 'utf-8', (err, data) => resolve(data)))

const server = http.createServer(async (req, resp) => {
    if (req.url === '/') {
        resp.end(await readFile('index.html'))
    } else if (req.url === '/Browser.js') {
        resp.end(await readFile('Browser.js'))
    } else if (req.url === '/vue.js') {
        resp.end(await readFile('vue.js'))
    } else {
        resp.end()
    }
}).listen(5000)

let player1, player2
let player1Color = 'X'
let player2Color = 'O'
let playerTurn = 1
let board = Array(ROW_NUM).fill().map(() => Array(COL_NUM).fill(' '))
// let player2Pieces = Array(ROW_NUM).fill().map(() => Array(COL_NUM).fill(' '));

new ws.Server({ server }).on('connection', client => {
    if (player1) {        // If both players have been connected
        player2 = client
        console.log('Player 2 connected as well. Initiating game.')
        player2.send('2')      // signalling player that you are player 2

        // Now telling both players to start game
        player1.send('3')
        player2.send('3')

        player1.on('message', choice => {
            if (playerTurn === 1) {
                console.log('Choice received from player1: ', choice)
                let [row, col] = JSON.parse(choice)
                board[row][col] = player1Color
                if (check4Connected(1)) {   // if player 1 has connected 4 i.e. won game
                    player1.send('Won')
                    player2.send(choice)
                    player2.send('Lost')
                } else {
                    player2.send(choice)
                }
            }
            playerTurn = 2              // TODO: possibly remove playerTurn as its not required
        })

        player2.on('message', choice => {
            if (playerTurn === 2) {
                console.log('Choice received from player2: ', choice)
                let [row, col] = JSON.parse(choice)
                board[row][col] = player2Color
                if (check4Connected(2)) {   // if player 2 has connected 4 i.e. won game
                    player1.send('Lost')
                    player1.send(choice)
                    player2.send('Won')
                } else {
                    player1.send(choice)
                }
            }
            playerTurn = 1
        })
        
    } else {
        board = Array(ROW_NUM).fill().map(() => Array(COL_NUM).fill(' '))
        // Only one player connected so far
        player1 = client
        console.log('Player 1 connected. Waiting for Player 2...')
        client.send('1')      // signalling player that you are player 1
    }

    client.on('close', () => {
        console.log('A player disconnected')
    })
})

const check4Connected = (player) => {
    let piece = (player == 1) ? 'X' : 'O'
                                            // TODO Possibly highlight winning indices
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
    // checking diagonally down way                  // TODO Implement diagonal
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
