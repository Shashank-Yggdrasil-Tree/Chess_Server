import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import http from 'http'
// import { pool } from '../db/dbConnection.js'
import Player from '../model/Player.js'
import bcrypt from 'bcrypt'
import { Server } from 'socket.io'
import { v4 as uuidV4 } from 'uuid'
import { logger } from '../middleware/logEvents.js'
import { credentials } from '../middleware/credentials.js'
import mongoose from 'mongoose'
import { connectDB } from '../config/dbconfig.js'

import { errorHandler } from '../middleware/errorHandler.js'
import { verifyJWT } from '../middleware/verifyJWT.js'

import { corsOptions } from '../config/corsOptions.js'

import registerRoute from '../routes/register.js'
import authRoute from '../routes/auth.js'
import refreshRoute from '../routes/refresh.js'
import logoutRoute from '../routes/logout.js'
import cookieParser from 'cookie-parser'
import playersRouter from '../routes/api/players.js'
import friendsRouter from '../routes/api/friends.js'

export const app = express() // initialize express
// set port to value received from environment variable or 4242 if null
const port = process.env.PORT || 4242

// Connect to MongoDB
connectDB()

// custom middleware logger
app.use(logger)

// parse the cookies
app.use(cookieParser())

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials)

const server = http.createServer(app)

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: false }))

// Use the middleware with your Socket.IO server

app.use(cors(corsOptions))
app.use(express.json())

// upgrade http server to websocket server
const io = new Server(server, {
    cors: corsOptions,
})

const roomsMap = new Map()

// function isValidRequestBody(body) {
//     return body !== null && body !== undefined && body !== 0 && body !== false && body !== ''
// }

// io.connection
io.on('connection', (socket) => {
    // socket refers to the client socket that just got connected.
    // each socket is assigned an id
    console.log(socket.id, 'connected')

    //listen to username event
    socket.on('username', (username) => {
        // callback here refers to the callback function from the client passed as data
        console.log('username', username)
        socket.data.username = username
    })

    socket.on('createRoom', async (callback) => {
        const roomId = uuidV4()
        await socket.join(roomId)

        // set roomId as a key and roomData including players as value in the map
        roomsMap.set(roomId, {
            roomId,
            players: [{ id: socket.id, username: socket.data?.username }],
        })

        roomsMap.forEach((room, roomId) => {
            console.log(`Players in room ${roomId}:`, room.players)
        })

        callback(roomId)
    })

    socket.on('joinRoom', async (args, callback) => {
        // check if room exists and has a player waiting
        const room = roomsMap.get(args.roomId)

        let error, message

        if (!room) {
            // if room does not exist
            error = true
            message = 'room does not exist'
        } else if (room.length <= 0) {
            // if room is empty set appropriate message
            error = true
            message = 'room is empty'
        } else if (room.players.length >= 2) {
            // if room is full
            error = true
            message = 'room is full' // set message to 'room is full'
        }

        if (error) {
            // if there's an error, check if the client passed a callback,
            // call the callback (if it exists) with an error object and exit or
            // just exit if the callback is not given

            if (callback) {
                // if user passed a callback, call it with an error payload
                callback({
                    error,
                    message,
                })
            }

            return // exit
        }

        await socket.join(args.roomId) // make the joining client join the room

        // add the joining user's data to the list of players in the room
        const roomUpdate = {
            ...room,
            players: [...room.players, { id: socket.id, username: socket.data?.username }],
        }

        roomsMap.set(args.roomId, roomUpdate)

        roomsMap.forEach((room, roomId) => {
            console.log(`Players in room ${roomId}:`, room.players)
        })

        callback(roomUpdate) // respond to the client with the room details.

        // emit an 'opponentJoined' event to the room to tell the other player that an opponent has joined
        socket.to(args.roomId).emit('opponentJoined', roomUpdate)
    })

    socket.on('move', (data) => {
        // emit to all sockets in the room except the emitting socket.
        socket.to(data.room).emit('move', data.move)
    })

    // message

    socket.on('message', (args, callback) => {
        console.log('args of message', args)
        console.log('callback of message', callback)
        const room = roomsMap.get(args.roomId)

        let error, m

        if (!room) {
            // if room does not exist
            error = true
            m = 'room does not exist'
        } else if (room.length <= 0) {
            // if room is empty set appropriate message
            error = true
            m = 'room is empty'
        } else if (!args.messageText || args.messageText.trim() === '') {
            error = true
            m = 'message is empty'
        }

        if (error) {
            // if there's an error, check if the client passed a callback,
            // call the callback (if it exists) with an error object and exit or
            // just exit if the callback is not given

            if (callback) {
                // if user passed a callback, call it with an error payload
                callback({
                    error,
                    m,
                })
            }

            return // exit
        }

        const message = {
            id: uuidV4(),
            text: args.messageText,
            username: args.username,
        }

        callback(message)

        // emit to all sockets in the room except the emitting socket.
        socket.to(args.roomId).emit('messageRecieved', message)
    })

    socket.on('disconnect', () => {
        const gameRooms = Array.from(roomsMap.values()) // <- 1

        gameRooms.forEach((room) => {
            const userInRoom = room.players.find((player) => player.id === socket.id)

            if (userInRoom) {
                if (room.players.length < 2) {
                    // if there's only 1 player in the room, close it and exit.
                    roomsMap.delete(room.roomId)
                    return
                }

                socket.to(room.roomId).emit('playerDisconnected', userInRoom)
            }
        })
    })

    socket.on('closeRoom', async (data) => {
        socket.to(data.roomId).emit('closeRoom', data) // <- 1 inform others in the room that the room is closing

        const clientSockets = await io.in(data.roomId).fetchSockets() // <- 2 get all sockets in a room

        // loop over each socket client
        clientSockets.forEach((s) => {
            s.leave(data.roomId) // <- 3 and make them leave the room on socket.io
        })

        roomsMap.delete(data.roomId) // <- 4 delete room from roomsMap map
    })

    socket.on('logout', () => {
        const gameRooms = Array.from(roomsMap.values())

        gameRooms.forEach((room) => {
            const userInRoom = room.players.find((player) => player.id === socket.id)

            if (userInRoom) {
                socket.to(room.roomId).emit('playerDisconnected', userInRoom)

                // Remove the user from the room's player list
                room.players = room.players.filter((player) => player.id !== socket.id)

                if (room.players.length === 0) {
                    // If there are no more players in the room, close it
                    roomsMap.delete(room.roomId)
                }
            }
        })
    })
})

export const usernameExists = async (user) => {
    const duplicate = await Player.findOne({ username: user }).exec()

    return duplicate
}

app.use('/register', registerRoute) // register
app.use('/auth', authRoute) //login
app.use('/refresh', refreshRoute)
app.use('/logout', logoutRoute)
app.use('/api/friend', friendsRouter)

app.get('/q', async (req, res) => {
    res.send('qwerty')
})

app.use(verifyJWT)
// Simple route to fetch users from the 'user' table
app.use('/api/search', playersRouter)

app.get('/power', async (req, res) => {
    res.json('hello admin')
})

// app.get('/validate-username', async (req, res) => {
//     const username = req.query.username
//     if (!username) {
//         return res.status(400).send({ status: 'error', message: 'Username is required' })
//     }

//     try {
//         const username_exists = await usernameExists(username)
//         if (username_exists === '1') {
//             res.send({ status: 200, message: 1 })
//             // or use 409 for conflict
//         } else {
//             res.send({ status: 200, message: 0 })
//         }
//     } catch (error) {
//         res.status(500).send('Internal Server Error')
//     }
// })

// app.post('/register', async (req, res) => {
//     if (!isValidRequestBody(req.body)) {
//         return res.status(400).json({ message: 'Invalid or empty request body' })
//     }

//     const { username, password, confirmPassword } = req.body

//     const duplicate = await usernameExists(username)
//     if (duplicate) {
//         return res.status(401).json({ message: 'Username already exists' })
//     }

//     if (password !== confirmPassword) {
//         return res.status(400).json({ message: 'Passwords do not match' })
//     }

//     // try {
//     //     const hashedPassword = await bcrypt.hash(password, 10)

//     //     // const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [
//     //     //     username,
//     //     //     hashedPassword,
//     //     // ])

//     //     // if (result.rowCount > 0) {
//     //     //     return res.status(201).json({ userCreated: true })
//     //     // } else {
//     //     //     return res.status(500).json({ message: 'Something went wrong' })
//     //     // }
//     // } catch (error) {
//     //     console.error('Error executing query', error)
//     //     return res.status(500).send('Internal Server Error')
//     // }
// })

// app.post('/login', async (req, res) => {
//     if (!isValidRequestBody(req.body)) {
//         return res.status(400).json({ message: 'Invalid or empty request body' })
//     }

//     const { username, password } = req.body

//     // try {
//     //     const result = await pool.query('SELECT username, password FROM users WHERE username = $1', [username])

//     //     if (result.rows.length === 0) {
//     //         return res.status(401).json({ message: 'User not found' })
//     //     }

//     //     const hashedPassword = result.rows[0].password

//     //     const passwordMatch = await bcrypt.compare(password, hashedPassword)

//     //     if (!passwordMatch) {
//     //         return res.status(401).json({ message: 'Invalid password' })
//     //     }

//     //     return res.status(200).json({ isLoggedIn: true })
//     // } catch (error) {
//     //     console.error('Error executing query', error)
//     //     return res.status(500).send('Internal Server Error')
//     // }
// })

app.use(errorHandler)

try {
    mongoose.connection.once('open', () => {
        console.log('Connect to MongoDB')
        server.listen(port, () => console.log(`listening on *:${port}`))
    })
} catch (error) {
    console.log(error)
}
