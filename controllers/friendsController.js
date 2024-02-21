import mongoose from 'mongoose'
import Player from '../model/Player.js'

const updateFriendStatus = async (senderPlayer, receiverPlayer, status) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const options = { session }
        // Update sender's friend status
        const senderFriendIndex = senderPlayer.friends.findIndex((friend) => friend.friendId.equals(receiverPlayer._id))
        if (senderFriendIndex !== -1) {
            senderPlayer.friends[senderFriendIndex].status = status
        }

        // Update receiver's friend status
        const receiverFriendIndex = receiverPlayer.friends.findIndex((friend) =>
            friend.friendId.equals(senderPlayer._id)
        )
        if (receiverFriendIndex !== -1) {
            receiverPlayer.friends[receiverFriendIndex].status = status
        }

        // Save changes within the transaction
        await senderPlayer.save(options)
        await receiverPlayer.save(options)

        // Commit the transaction
        await session.commitTransaction()
    } catch (error) {
        // If an error occurs, abort the transaction
        await session.abortTransaction()
        throw error
    } finally {
        session.endSession()
    }
}

const getAllFriendsStatus = async (req, res) => {
    try {
        const senderPlayerUsername = req.query.sender_username

        if (!senderPlayerUsername) {
            return res.status(400).json({ message: 'Invalid or empty params user id' })
        }

        const senderPlayer = await Player.findOne({ username: senderPlayerUsername })
            .populate('friends.friendId', 'username')
            .exec()

        if (!senderPlayer) {
            return res.status(401).json({ message: 'User not found' }) //Unauthorized
        }

        res.json(senderPlayer.friends)
    } catch (error) {
        res.status(500).json({
            message: `Unable to retrieve friend status for the player with username: ${req.query.sender_username}. Please try again later.`,
        })
    }
}

const sendFriendRequest = async (req, res) => {
    const senderPlayerUsername = req.query.sender_username
    const receiverPlayerUsername = req.query.receiver_username

    if (!senderPlayerUsername || !receiverPlayerUsername) {
        return res.status(400).json({ message: 'Invalid or empty request params username' })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const senderPlayer = await Player.findOne({ username: senderPlayerUsername }).session(session).exec()
        const receiverPlayer = await Player.findOne({ username: receiverPlayerUsername }).session(session).exec()

        if (!senderPlayer || !receiverPlayer) {
            return res.status(401).json({ message: `User not found` }) //Unauthorized
        }

        // Check if there is an existing friend request sent by the senderPlayer to the receiverPlayer
        const existingFriendRequest = senderPlayer.friends.find(
            (friend) => friend.friendId.equals(receiverPlayer._id) && friend.status === 'sent_pending'
        )

        if (!existingFriendRequest) {
            senderPlayer.friends.push({ friendId: receiverPlayer._id, status: 'sent_pending' })
            receiverPlayer.friends.push({ friendId: senderPlayer._id, status: 'received_pending' })
        } else {
            return res.json({ message: 'Friend request sent already!' })
        }

        // Save the changes
        await senderPlayer.save({ session })
        await receiverPlayer.save({ session })

        // Commit the transaction
        await session.commitTransaction()

        return res.json({ message: 'Friend request sent successfully!' })
    } catch (error) {
        // If an error occurs, abort the transaction
        await session.abortTransaction()
        console.log(error)
        res.status(500).json({ message: 'Error sending friend request' })
    } finally {
        session.endSession()
    }
}

const acceptFriendRequest = async (req, res) => {
    const senderPlayerUsername = req.query.sender_username
    const receiverPlayerUsername = req.query.receiver_username

    if (!senderPlayerUsername || !receiverPlayerUsername) {
        return res.status(400).json({ message: 'Invalid or empty params user id' })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const senderPlayer = await Player.findOne({ username: senderPlayerUsername }).session(session).exec()
        const receiverPlayer = await Player.findOne({ username: receiverPlayerUsername }).session(session).exec()

        if (!senderPlayer || !receiverPlayer) {
            // End the session before sending the response
            session.endSession()
            return res.status(401).json({ message: `User not found` }) //Unauthorized
        }

        await updateFriendStatus(senderPlayer, receiverPlayer, 'friends')

        // Commit the transaction
        await session.commitTransaction()
        session.endSession()

        return res.json({ message: 'Friend request accepted!' })
    } catch (error) {
        // If an error occurs, abort the transaction
        await session.abortTransaction()
        session.endSession()
        res.status(500).json({ message: 'Error while accepting the friend request. Please try again' })
    }
}

const deleteFriend = async (req, res) => {
    const senderPlayerUsername = req.query.sender_username
    const receiverPlayerUsername = req.query.receiver_username

    if (!senderPlayerUsername || !receiverPlayerUsername) {
        return res.status(400).json({ message: 'Invalid or empty params user id' })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const senderPlayer = await Player.findOne({ username: senderPlayerUsername }).session(session).exec()
        const receiverPlayer = await Player.findOne({ username: receiverPlayerUsername }).session(session).exec()

        if (!senderPlayer || !receiverPlayer) {
            // End the session before sending the response
            session.endSession()
            return res.status(401).json({ message: `User not found` }) //Unauthorized
        }

        // updateFriendStatus(senderPlayer, receiverPlayer, 'unfriend')
        await Player.findOneAndUpdate(
            { _id: senderPlayer._id },
            { $pull: { friends: { friendId: receiverPlayer._id } } }
        ).session(session)

        await Player.findOneAndUpdate(
            { _id: receiverPlayer._id },
            { $pull: { friends: { friendId: senderPlayer._id } } }
        ).session(session)

        // Commit the transaction
        await session.commitTransaction()
        session.endSession()

        res.json({ message: 'Friend deleted successfully!' })
    } catch (error) {
        // If an error occurs, abort the transaction
        await session.abortTransaction()
        session.endSession()
        res.status(500).json({ message: 'Error deleting friend. Please try again later.' })
    }
}

const friendsController = {
    getAllFriendsStatus,
    sendFriendRequest,
    acceptFriendRequest,
    deleteFriend,
}

export default friendsController
