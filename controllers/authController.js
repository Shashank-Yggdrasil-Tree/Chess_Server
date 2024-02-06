import dotenv from 'dotenv'
dotenv.config()
import Player from '../model/Player.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const handleLogin = async (req, res) => {
    const cookies = req.cookies
    const { user, pwd } = req.body
    console.log({ user, pwd })
    if (!user || !pwd) return res.status(400).json({ message: 'Username and password are required.' })

    const foundUser = await Player.findOne({ username: user }).exec()
    if (!foundUser) {
        return res.status(401).json({ message: 'User not found' }) //Unauthorized
    }

    // evaluate password
    // console.log({ pwd, hpwd: foundUser.password, user: foundUser.username })
    const match = await bcrypt.compare(pwd, foundUser.password)
    if (match) {
        // create JWTs
        const accessToken = jwt.sign({ username: foundUser.username }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '15m',
        })
        const newRefreshToken = jwt.sign({ username: foundUser.username }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '1d',
        })

        let newRefreshTokenArray = !cookies?.__chess_jwt
            ? foundUser.refreshToken
            : foundUser.refreshToken.filter((rt) => rt !== cookies.__chess_jwt)

        if (cookies?.__chess_jwt) {
            /**
             * Scenario added here:
             * 1) User logs in but never uses RT and does not logout
             * 2) RT is stolen
             * 3) If 1 & 2, reuse detection is needed to clear all RTs when user logs in
             */

            const refreshToken = cookies.__chess_jwt
            const foundToken = await Player.findOne({ refreshToken }).exec()

            // Detected refresh token reuse!
            if (!foundToken) {
                console.log('attempted refresh token reuse at login')
                // clear out All previous refresh tokens
                newRefreshTokenArray = []
            }

            res.clearCookie('__chess_jwt', { httpOnly: true, sameSite: 'None', secure: true })
        }

        // Saving refreshToken with current user
        foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken]
        const result = await foundUser.save()
        console.log(result)

        res.cookie('__chess_jwt', newRefreshToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 24 * 60 * 60 * 1000,
        })
        res.json({ user: result.username, accessToken })
    } else {
        res.sendStatus(401)
    }
    // try {
    //     const result = await pool.query('SELECT username, password FROM users WHERE username = $1', [username])

    //     const foundUser = result.rows.length === 0

    //     const hashedPassword = result.rows[0].password
    //     const username = result.rows[0].username
    // } catch (error) {
    //     res.status(500).json({ message: err.message })
    // }
}

export default { handleLogin }
