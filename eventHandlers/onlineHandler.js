import { addUserToOnlineList } from '../utilities/onlineListManager.js'
import { getAllFriends } from '../utilities/friendsManager.js'

export const handleOnlineStatus = async (socket, username) => {
    addUserToOnlineList(username)

    try {
        const { friendUsernames } = await getAllFriends(username)

        if (friendUsernames && Array.isArray(friendUsernames)) {
            friendUsernames.forEach((friend) => {
                socket.to(friend).emit('friendOnlineStatus', { username, status: 'online' })
            })
        } else {
            console.error('Friend usernames not found or not in expected format')
        }
    } catch (error) {
        console.error('Error getting friend usernames:', error)
    }
}
