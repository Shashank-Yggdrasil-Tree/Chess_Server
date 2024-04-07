import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import http from 'http'
// import { pool } from '../db/dbConnection.js'
import Player from '../model/Player.js'
import { Server } from 'socket.io'
import { logger } from '../middleware/logEvents.js'
import { credentials } from '../middleware/credentials.js'
import mongoose from 'mongoose'
import { connectDB } from '../config/dbConfig.js'

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

import { handleDisconnection } from '../eventHandlers/connectionHandler.js'
import { handleCreateRoom } from '../eventHandlers/createRoomHandler.js'
import { handleJoinRoom } from '../eventHandlers/joinRoomHandler.js'
import { handleMessage } from '../eventHandlers/messageHandler.js'
import { handleLogout } from '../eventHandlers/logoutHandler.js'
import { handleCloseRoom } from '../eventHandlers/closeRoomHandler.js'
import { handleUserLogin } from '../eventHandlers/userLoginHandler.js'
import { handleGameMove } from '../eventHandlers/moveHandler.js'

import path from 'path'
import { handleOnlineFriends } from '../eventHandlers/friendsOnlineHandler.js'
import { handleOnlineStatus } from '../eventHandlers/onlineHandler.js'
import { handleOfflineStatus } from '../eventHandlers/offlineHandler.js'
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

// GLOBAL MIDDLEWARE

const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    handler: (req, res) => {
        res.status(429).send('Too many request, please try again in an hour')
    },
})

app.use('/', limiter)

// upgrade http server to websocket server
export const io = new Server(server, {
    cors: corsOptions,
})

export const roomsMap = new Map()

// io.connection
io.on('connection', (socket) => {
    // socket refers to the client socket that just got connected.
    // each socket is assigned an id
    socket.on('username', (username) => handleUserLogin(socket, username))
    socket.on('createRoom', (args, callback) => handleCreateRoom(socket, args, callback))
    socket.on('joinRoom', (args, callback) => handleJoinRoom(socket, args, callback))
    socket.on('move', (data) => handleGameMove(socket, data))
    socket.on('message', (args, callback) => handleMessage(socket, args, callback))
    socket.on('disconnect', () => handleDisconnection(socket))
    socket.on('logout', () => handleLogout(socket))
    socket.on('closeRoom', (data) => handleCloseRoom(socket, data))
    socket.on('online', (username) => handleOnlineStatus(socket, username))
    socket.on('offline', (username) => handleOfflineStatus(socket, username))
})

export const usernameExists = async (user) => {
    const duplicate = await Player.findOne({ username: user }).exec()

    return duplicate
}

app.use('/register', registerRoute) // register
app.use('/auth', authRoute) //login
app.use('/refresh', refreshRoute)
app.use('/logout', logoutRoute)

// Middleware for JWT verification
app.use(['/api/search', '/api/friend'], verifyJWT)

// Simple route to fetch users from the 'user' table
app.use('/api/search', playersRouter)

app.use('/api/friend', friendsRouter)

// // Serve the static files from the React app
// app.use(express.static(path.resolve('client_build')))

// Handles any requests that don't match the ones above
// app.get('*', (req, res) => {
//     res.sendFile(path.resolve('client_build', 'index.html'))
// })

app.use(errorHandler)

try {
    mongoose.connection.once('open', () => {
        //console.log('Connect to MongoDB')
        server.listen(port, () => console.log(`listening on *:${port}`))
    })
} catch (error) {
    //console.log(error)
}
