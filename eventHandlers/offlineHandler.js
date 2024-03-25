import { removeUserFromOnlineList } from '../utilities/onlineListManager.js'
import { getAllFriends } from '../utilities/friendsManager.js'

export const handleOfflineStatus = async (socket, username) => {
    removeUserFromOnlineList(username)

    try {
        const { friendUsernames } = await getAllFriends(username)

        if (friendUsernames && Array.isArray(friendUsernames)) {
            friendUsernames.forEach((friend) => {
                socket.to(friend).emit('friendOnlineStatus', { username, status: 'offline' })
            })
        } else {
            console.error('Friend usernames not found or not in expected format')
        }
    } catch (error) {
        console.error('Error getting friend usernames:', error)
    }
}
