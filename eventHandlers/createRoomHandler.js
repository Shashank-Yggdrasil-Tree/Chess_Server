import { roomsMap } from '../api/index.js'
import { v4 as uuidV4 } from 'uuid'

export const handleCreateRoom = async (socket, args, callback) => {
    // handle room creation

    //console.log('challenge has been created by: ', args.challenger)
    //console.log('challenge should be sent to: ', args.challengee)
    //console.log('socket.data', socket.data.username)

    let error, m

    if (!socket.data?.username) {
        // if room does not exist
        error = true
        m = 'username is undefined in socket data'
    }
    // else if (socket.data.some())

    if (error) {
        // if there's an error, check if the client passed a callback,
        // call the callback (if it exists) with an error object and exit or
        // just exit if the callback is not given

        if (callback) {
            // if user passed a callback, call it with an error payload
            callback({
                error,
                m,
            })
        }

        return // exit
    }

    const roomId = uuidV4()
    await socket.join(roomId)

    // Handle custom event for sending notifications
    // socket.on('sendChallenge', (data) => {
    //     // Emit the notification to the specific client
    //     io.to(data.userId).emit('notification', { message: data.message })
    // })

    socket.to(args.challengee).emit('challenge', { roomId, challenger: args.challenger })

    // set roomId as a key and roomData including players as value in the map
    roomsMap.set(roomId, {
        roomId,
        players: [{ id: socket.id, username: socket.data?.username }],
    })

    roomsMap.forEach((room, roomId) => {
        //console.log(`Players in room ${roomId}:`, room.players)
    })

    callback(roomId)
}
