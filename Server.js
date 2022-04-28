const http = require('http')
const ws = require('ws')

const PORT = 5000
const SERVER_MESSAGES = {
    YOU_ARE_PLAYER_ONE: '1',
    YOU_ARE_PLAYER_TWO: '2',
    START_GAME: '3'
}
const playerGroupMap = {}

const server = http.createServer().listen(PORT)
const wsServer = new ws.WebSocketServer({server});


const setupGameEvents = (playerGroup) => {
    playerGroup.first.on('message', msg => {
        console.log('Message received from player 1: ', msg)
        playerGroup.second.send(msg)
    })
    playerGroup.second.on('message', msg => {
        console.log('Message received from player 2: ', msg)
        playerGroup.first.send(msg)
    })
}

const startGame = playerGroup => {
    playerGroup.first.send(SERVER_MESSAGES.START_GAME)
    playerGroup.second.send(SERVER_MESSAGES.START_GAME)
}


wsServer.on('connection', (client, request) => {
    const token = request.url.split('=')[1]
    const playerGroup = playerGroupMap[token]
    if (!playerGroup) { // No player group  -> create new
        playerGroupMap[token] = {first: client, second: null}
        console.log(`New player group created with token ${token}`)
        client.send(SERVER_MESSAGES.YOU_ARE_PLAYER_ONE) // Tell client it's player 1
    } else { // Player group already exists -> join
        playerGroup.second = client
        console.log(`New player added to group ${token}`)
        client.send(SERVER_MESSAGES.YOU_ARE_PLAYER_TWO) // Tell client it's player 2
        setupGameEvents(playerGroup)
        startGame(playerGroup)
        delete playerGroupMap[token]
        console.log('GAME STARTED')
        if(Object.keys(playerGroupMap).length) {
            console.log(`Groups waiting to start: ${Object.keys(playerGroupMap)}`)
        } else {
            console.log('No remaining waiting groups left.')
        }
    }

    client.on('close', () => {
        console.log(`A player disconnected from group ${token}`)
    })
})

console.log(`Connect4 server now running at http://localhost:${PORT}`)
console.log('Waiting for browser connection...')