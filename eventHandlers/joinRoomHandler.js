import { roomsMap } from '../api/index.js'

export const handleJoinRoom = async (socket, args, callback) => {
    // Handles user joinning a existing room
    // check if room exists and has a player waiting
    const room = roomsMap.get(args.roomId)

    let error, message

    if (!room) {
        // if room does not exist
        error = true
        message = 'room does not exist'
    } else if (room.length <= 0) {
        // if room is empty set appropriate message
        error = true
        message = 'room is empty'
    } else if (room.players.length >= 2) {
        // if room is full
        error = true
        message = 'room is full' // set message to 'room is full'
    }

    if (error) {
        // if there's an error, check if the client passed a callback,
        // call the callback (if it exists) with an error object and exit or
        // just exit if the callback is not given

        if (callback) {
            // if user passed a callback, call it with an error payload
            callback({
                error,
                message,
            })
        }

        return // exit
    }

    await socket.join(args.roomId) // make the joining client join the room

    // add the joining user's data to the list of players in the room
    const roomUpdate = {
        ...room,
        players: [...room.players, { id: socket.id, username: socket.data?.username }],
    }

    roomsMap.set(args.roomId, roomUpdate)

    roomsMap.forEach((room, roomId) => {
        //console.log(`Players in room ${roomId}:`, room.players)
    })

    callback(roomUpdate) // respond to the client with the room details.

    // emit an 'opponentJoined' event to the room to tell the other player that an opponent has joined
    socket.to(args.roomId).emit('opponentJoined', roomUpdate)
}
