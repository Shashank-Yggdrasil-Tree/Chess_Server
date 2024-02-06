import mongoose from 'mongoose'
const Schema = mongoose.Schema

const playerSchema = new Schema({
    username: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    refreshToken: [String],
})

const Player = mongoose.model('Player', playerSchema)

export default Player
