import { onlineList } from '../utilities/onlineListManager.js'
import { getAllFriends } from '../utilities/friendsManager.js'

export const handleOnlineFriends = async (socket, username) => {
    // Handles Online tracking of the user

    const { player, friendUsernames } = getAllFriends(username)

    const friendsOnline = onlineList.filter((username) => friendUsernames.includes(username))

    // socket.emit()
}
