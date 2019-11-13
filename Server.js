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
let player1Pieces = Array(ROW_NUM).fill().map(() => Array(COL_NUM).fill(' '));
let player2Pieces = Array(ROW_NUM).fill().map(() => Array(COL_NUM).fill(' '));

new ws.Server({ server }).on('connection', client => {
    if (player1) {        // If both players have been connected
        player2 = client
        console.log('Player 2 connected as well. Initiating game.')
        player2.send('2')      // signalling player that you are player 2

        // Now telling both players to start game
        player1.send('3')
        player2.send('3')

        // while (true) {
        //     if (playerTurn === 1) {
        //         console.log('Choice recieved from player1: ', choice)
        //     }
        // }

        player1.on('message', choice => {
            if (playerTurn === 1) {
                console.log('Choice received from player1: ', choice)
                let [row, col] = JSON.parse(choice)
                player1Pieces[row][col] = player1Color
                // check4Connected()
                player2.send(choice)
            }
            playerTurn = 2
        })

        player2.on('message', choice => {
            if (playerTurn === 2) {
                console.log('Choice received from player2: ', choice)
                let [row, col] = JSON.parse(choice)
                player2Pieces[row][col] = player2Color
                // check4Connected()
                player1.send(choice)
            }
            playerTurn = 1
        })
        
    } else {
        // Only one player connected so far
        player1 = client
        console.log('Player 1 connected. Waiting for Player 2...')
        client.send('1')      // signalling player that you are player 1
    }

    client.on('close', () => {
        console.log('A player disconnected')
    })
})
