import express from 'express'
const playersRouter = express.Router()
import playersController from '../../controllers/playersController.js'

playersRouter.route('/').get(playersController.searchPlayers)

export default playersRouter
