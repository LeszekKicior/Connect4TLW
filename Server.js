const http = require('http')
const ws = require('ws')

const PORT = 5000
const SERVER_MESSAGES = {
    YOU_ARE_PLAYER_ONE: 'player-1',
    YOU_ARE_PLAYER_TWO: 'player-2',
    START_GAME: 'start',
    WIN: 'win',
    STALEMATE: 'stalemate',
    RESET: 'reset',
    OPPONENT_DISCONNECTED: 'disconnected',
    ROOM_FULL: 'full'
}
const playerGroupMap = {} // Used for temporarily storing pairs of players for matchmaking

const server = http.createServer().listen(PORT)
const wsServer = new ws.WebSocketServer({server});


const setupGameEvents = (playerGroup, token) => {
    playerGroup.first.on('message', msg => {
        console.log('Message received from player 1: ', msg)
        playerGroup.second.send(msg)
    })
    playerGroup.second.on('message', msg => {
        console.log('Message received from player 2: ', msg)
        playerGroup.first.send(msg)
    })

    playerGroup.first.on('close', () => {
        playerGroup.second.send(SERVER_MESSAGES.OPPONENT_DISCONNECTED)
        playerGroupMap[token] = {
            first: null,
            second: playerGroup.second
        }
    })
    playerGroup.second.on('close', () => {
        playerGroup.first.send(SERVER_MESSAGES.OPPONENT_DISCONNECTED)
        playerGroupMap[token] = {
            first: playerGroup.first,
            second: null
        }
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
        if(!playerGroup.first) {
            playerGroup.first = client
            client.send(SERVER_MESSAGES.YOU_ARE_PLAYER_ONE) // Tell client it's player 1
        }
        else if (!playerGroup.second) {
            playerGroup.second = client
            client.send(SERVER_MESSAGES.YOU_ARE_PLAYER_TWO) // Tell client it's player 2
        } else {
            client.send(SERVER_MESSAGES.ROOM_FULL)
        }
        console.log(`New player added to group ${token}`)

        setupGameEvents(playerGroup, token)
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