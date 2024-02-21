import express from 'express'
const friendsRouter = express.Router()
import friendsController from '../../controllers/friendsController.js'

friendsRouter.route('/status').get(friendsController.getAllFriendsStatus)
friendsRouter.route('/send_request').post(friendsController.sendFriendRequest)
friendsRouter.route('/accept_request').put(friendsController.acceptFriendRequest)
friendsRouter.route('/unfriend').delete(friendsController.deleteFriend)

export default friendsRouter
