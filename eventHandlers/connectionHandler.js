import { roomsMap } from '../api/index.js'
import { removeUserFromOnlineList } from '../utilities/onlineListManager.js'

export const handleDisconnection = (socket) => {
    // Handle disconnection

    const gameRooms = Array.from(roomsMap.values()) // <- 1

    gameRooms.forEach((room) => {
        const userInRoom = room.players.find((player) => player.id === socket.id)

        if (userInRoom) {
            if (room.players.length < 2) {
                // if there's only 1 player in the room, close it and exit.
                roomsMap.delete(room.roomId)
                return
            }

            // removing the username from onList on disconnection
            // onlineList = onlineList.filter((username) => userInRoom.username !== username)

            removeUserFromOnlineList(userInRoom.username)

            socket.to(room.roomId).emit('playerDisconnected', userInRoom)
        }
    })
}
