export const handleGameMove = (socket, data) => {
    // handles game move
    // emit to all sockets in the room except the emitting socket.
    socket.to(data.room).emit('move', data.move)
}
