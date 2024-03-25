import { io, roomsMap } from '../api/index.js'

export const handleCloseRoom = async (socket, data) => {
    // Handles close room

    socket.to(data.roomId).emit('closeRoom', data) // <- 1 inform others in the room that the room is closing

    const clientSockets = await io.in(data.roomId).fetchSockets() // <- 2 get all sockets in a room

    // loop over each socket client
    clientSockets.forEach((s) => {
        s.leave(data.roomId) // <- 3 and make them leave the room on socket.io
    })

    roomsMap.delete(data.roomId) // <- 4 delete room from roomsMap map
}
