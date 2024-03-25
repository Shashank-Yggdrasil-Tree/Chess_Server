import { handleOnlineStatus } from './onlineHandler.js'

export const handleUserLogin = async (socket, username) => {
    // Handles Online tracking of the user
    socket.data.username = username

    socket.join(username)

    socket.join('globalRoom')

    await handleOnlineStatus(socket, username)
}
