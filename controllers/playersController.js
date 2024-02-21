import Player from '../model/Player.js'

const searchPlayers = async (req, res) => {
    const playerUsername = req.query.username
    const limit = req.query.limit

    try {
        const results = await Player.find({ username: { $regex: new RegExp(playerUsername, 'i') } }).limit(limit)

        // Extract usernames from the results array
        const usernames = results.map((player) => player.username)

        res.json(usernames)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const playersController = {
    searchPlayers,
}

export default playersController
