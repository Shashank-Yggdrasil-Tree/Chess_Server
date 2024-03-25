import { roomsMap } from '../api/index.js'
import { v4 as uuidV4 } from 'uuid'

export const handleMessage = (socket, args, callback) => {
    // handles messages

    //console.log('args of message', args)
    //console.log('callback of message', callback)
    const room = roomsMap.get(args.roomId)

    let error, m

    if (!room) {
        // if room does not exist
        error = true
        m = 'room does not exist'
    } else if (room.length <= 0) {
        // if room is empty set appropriate message
        error = true
        m = 'room is empty'
    } else if (!args.messageText || args.messageText.trim() === '') {
        error = true
        m = 'message is empty'
    }

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

    const message = {
        id: uuidV4(),
        text: args.messageText,
        username: args.username,
    }

    callback(message)

    // emit to all sockets in the room except the emitting socket.
    socket.to(args.roomId).emit('messageRecieved', message)
}
