const http = require('http')
const ws = require('ws')

const parseMessage = message => {
    return JSON.parse(message.toString())
}

const getPlayerById = playerId => {
    return playerMap[playerId]
}

const PORT = 5000
const SERVER_MESSAGES = {
    YOU_ARE_PLAYER_ONE: 'player-1',
    YOU_ARE_PLAYER_TWO: 'player-2',
    START_GAME: 'start',
    WIN: 'win',
    STALEMATE: 'stalemate',
    RESET: 'reset',
    DISCONNECTED: 'disconnected',
    ROOM_FULL: 'full',
    ACTION_NOT_POSSIBLE: 'failed'
}

const MESSAGE_TYPES = {
    // CONNECTION: 'connection',
    MOVE: 'move',
    NEW_INVITE: 'invite',
    CONFIRM_INVITE: 'confirm',
    DECLINE_INVITE: 'decline',
    LIST_PLAYERS: 'list',
    SERVER_MESSAGE: 'server'
}

sendMessage = (player, payloadObj) => {
    const payload = JSON.stringify(payloadObj)
    player.send(payload)
}

sendServerMessage = (player, serverMessage) => {
    const payload = {
        type: MESSAGE_TYPES.SERVER_MESSAGE,
        data: serverMessage
    }
    sendMessage(player, payload)
}


const playerMap = {} // Used for storing connected players

const server = http.createServer().listen(PORT)
const wsServer = new ws.WebSocketServer({server});

//
// const setupGameEvents = (playerGroup, token) => {
//     playerGroup.first.on('message', msg => {
//         console.log('Message received from player 1: ', msg)
//         playerGroup.second.send(msg)
//     })
//     playerGroup.second.on('message', msg => {
//         console.log('Message received from player 2: ', msg)
//         playerGroup.first.send(msg)
//     })
//
//     playerGroup.first.on('close', () => {
//         playerGroup.second.send(SERVER_MESSAGES.OPPONENT_DISCONNECTED)
//         playerGroupMap[token] = {
//             first: null,
//             second: playerGroup.second
//         }
//     })
//     playerGroup.second.on('close', () => {
//         playerGroup.first.send(SERVER_MESSAGES.OPPONENT_DISCONNECTED)
//         playerGroupMap[token] = {
//             first: playerGroup.first,
//             second: null
//         }
//     })
// }
//
// const startGame = playerGroup => {
//     playerGroup.first.send(SERVER_MESSAGES.START_GAME)
//     playerGroup.second.send(SERVER_MESSAGES.START_GAME)
// }


wsServer.on('connection', (client, request) => {
    // const token = request.url.split('=')[1]
    // const playerGroup = playerGroupMap[token]
    // if (!playerGroup) { // No player group  -> create new
    //     playerGroupMap[token] = {first: client, second: null}
    //     console.log(`New player group created with token ${token}`)
    //     client.send(SERVER_MESSAGES.YOU_ARE_PLAYER_ONE) // Tell client it's player 1
    // } else { // Player group already exists -> join
    //     if(!playerGroup.first) {
    //         playerGroup.first = client
    //         client.send(SERVER_MESSAGES.YOU_ARE_PLAYER_ONE) // Tell client it's player 1
    //     }
    //     else if (!playerGroup.second) {
    //         playerGroup.second = client
    //         client.send(SERVER_MESSAGES.YOU_ARE_PLAYER_TWO) // Tell client it's player 2
    //     } else {
    //         client.send(SERVER_MESSAGES.ROOM_FULL)
    //     }
    //     console.log(`New player added to group ${token}`)
    //
    //     setupGameEvents(playerGroup, token)
    //     startGame(playerGroup)
    //     delete playerGroupMap[token]
    //
    //     console.log('GAME STARTED')
    //     if(Object.keys(playerGroupMap).length) {
    //         console.log(`Groups waiting to start: ${Object.keys(playerGroupMap)}`)
    //     } else {
    //         console.log('No remaining waiting groups left.')
    //     }
    // }
    const userId = request.url.split('=')[1]
    if(!userId) {
        return; // GUARD
    }
    playerMap[userId] = {client, opponentId: null};

    client.on('message', (msg) => {
        const parsedMessage = parseMessage(msg)
        console.log(parsedMessage)


        if(parsedMessage.type === MESSAGE_TYPES.NEW_INVITE) {
            console.log('NEW INVITATION')
            const invitedId = parsedMessage.data.userId
            const invitedPlayer = getPlayerById(invitedId)?.client
            if(!invitedPlayer) {
                sendServerMessage(client, SERVER_MESSAGES.ACTION_NOT_POSSIBLE)
                console.log('ERROR 125')
                return; //GUARD
            }
            sendMessage(invitedPlayer, {
                type: MESSAGE_TYPES.NEW_INVITE,
                data: {userId}
            })
        }
        if(parsedMessage.type === MESSAGE_TYPES.CONFIRM_INVITE) {
            console.log('INVITATION CONFIRMED')
            const opponentId = parsedMessage.data.userId
            if(!opponentId) {
                console.log('ERROR 137')
                sendServerMessage(client, SERVER_MESSAGES.ACTION_NOT_POSSIBLE)
                return //GUARD
            }
            getPlayerById(userId).opponentId = opponentId
            getPlayerById(opponentId).opponentId = userId
            const opponent = getPlayerById(opponentId).client;
            sendServerMessage(opponent, SERVER_MESSAGES.YOU_ARE_PLAYER_ONE)
            sendServerMessage(client, SERVER_MESSAGES.YOU_ARE_PLAYER_TWO)
            console.log('INVITATION CONFIRMED. OPPONENT ID: ', playerMap[userId].opponentId)
        }

        if(parsedMessage.type === MESSAGE_TYPES.MOVE) {
            console.log('NEW MOVE')
            const opponentId = getPlayerById(userId).opponentId
            const opponent = getPlayerById(opponentId).client
            sendMessage(opponent, {type: MESSAGE_TYPES.MOVE, data: parsedMessage.data})
        }

        if(parsedMessage.type === MESSAGE_TYPES.LIST_PLAYERS) {
            console.log('LISTING PLAYERS')
            const playerIdList = Object.keys(playerMap)
            console.log(playerIdList)
            sendMessage(client, {type: MESSAGE_TYPES.LIST_PLAYERS, data: playerIdList})
        }

        if(parsedMessage.type === SERVER_MESSAGES.RESET) {
            const opponentId = getPlayerById(userId).opponentId
            const opponent = getPlayerById(opponentId).client
            sendMessage(opponent, {type: MESSAGE_TYPES.SERVER_MESSAGE, data: SERVER_MESSAGES.RESET})
        }
    })

    client.on('close', () => {
        console.log(`Player ${userId} disconnected.`)
        delete playerMap[userId]
    })
})

console.log(`Connect4 server now running at http://localhost:${PORT}`)
console.log('Waiting for browser connection...')