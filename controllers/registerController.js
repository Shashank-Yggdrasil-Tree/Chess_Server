import dotenv from 'dotenv'
dotenv.config()
import Player from '../model/Player.js'
import bcrypt from 'bcrypt'
import { usernameExists } from '../api/index.js'

const handleNewUser = async (req, res) => {
    const { user, pwd, cpwd } = req.body
    //console.log({ user, pwd, cpwd })
    if (!user || !pwd || !cpwd)
        return res.status(400).json({ message: 'Username, Password and "Confirm Password" value are required.' })

    // check for duplicate usernames in the db
    const duplicate = await Player.findOne({ username: user }).exec()
    if (duplicate) return res.status(409).json({ message: 'Username already exists' }) //Conflict

    if (pwd !== cpwd) {
        return res.status(400).json({ message: 'Passwords do not match' })
    }

    try {
        //encrypt the password
        const hashedPwd = await bcrypt.hash(pwd, 10)

        //create and store the new user
        const result = await Player.create({
            username: user,
            password: hashedPwd,
        })

        //console.log(result)

        // const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [user, hashedPwd])

        return res.status(201).json({ userCreated: true })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

export default { handleNewUser }
