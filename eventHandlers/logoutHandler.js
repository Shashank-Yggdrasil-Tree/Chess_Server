import { roomsMap } from '../api/index.js'

export const handleLogout = (socket) => {
    // handles user logout

    const gameRooms = Array.from(roomsMap.values())

    gameRooms.forEach((room) => {
        const userInRoom = room.players.find((player) => player.id === socket.id)

        if (userInRoom) {
            socket.to(room.roomId).emit('playerDisconnected', userInRoom)

            // Remove the user from the room's player list
            room.players = room.players.filter((player) => player.id !== socket.id)

            if (room.players.length === 0) {
                // If there are no more players in the room, close it
                roomsMap.delete(room.roomId)
            }
        }
    })
}
