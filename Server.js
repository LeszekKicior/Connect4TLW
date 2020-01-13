/**     Assignment 3: Connect 4 Game (SERVER SIDE)
 *              @author Nouman Abbasi
*/

const fs = require('fs')
const http = require('http')
const ws = require('ws')

const PORT = 5000

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
}).listen(PORT)

let first, second

const playGame = (player1, player2) => {
    player1.on('message', msg => {
        console.log('Msg received from player1: ', msg)
        player2.send(msg)
    })

    player2.on('message', msg => {
        console.log('Msg received from player2: ', msg)
        player1.send(msg)
    })
}

new ws.Server({ server }).on('connection', client => {
    if (first) {        // If both players have been connected
        second = client
        console.log('Player 2 connected as well. Initiating game.')
        second.send('2')      // signalling player that you are player 2

        // Now telling both players to start game
        first.send('3')
        second.send('3')

        playGame(first, second)
        
        first = undefined
        second = undefined
    } else {
        // Only one player connected so far
        first = client
        console.log('Player 1 connected. Waiting for Player 2...')
        client.send('1')      // signalling player that you are player 1
    }

    client.on('close', () => {
        console.log('A player disconnected')
    })
})
