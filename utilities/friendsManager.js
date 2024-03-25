import Player from '../model/Player.js'

export const getAllFriends = async (username) => {
    try {
        const player = await Player.findOne({ username }).exec()

        if (!player) {
            return null
        }

        const friendIds = player.friends
            .filter((friend) => friend.status === 'friends')
            .map((friend) => friend.friendId)

        const friends = await Player.find({
            _id: { $in: friendIds },
        }).exec()

        const friendUsernames = friends.map((friend) => friend.username)

        return { player, friendUsernames }
    } catch (error) {
        console.error('Error finding player and friends:', error)
        throw error
    }
}
