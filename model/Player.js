import mongoose from 'mongoose'
const Schema = mongoose.Schema

const friendSchema = new Schema(
    {
        friendId: {
            type: Schema.Types.ObjectId,
            ref: 'Player',
            required: true,
        },
        status: {
            type: String,
            enum: ['sent_pending', 'received_pending', 'friends'],
            required: true,
        },
    },
    { timestamps: true }
)

const playerSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        refreshToken: [String],
        friends: [friendSchema],
    },
    { timestamps: true }
)

const Player = mongoose.model('Player', playerSchema)

export default Player
