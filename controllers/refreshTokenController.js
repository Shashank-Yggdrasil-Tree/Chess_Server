import Player from '../model/Player.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

// one refresh token per device with refresh token rotation

const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies
    console.log('cookies', cookies)
    if (!cookies?.__chess_jwt) return res.sendStatus(401)
    const refreshToken = cookies.__chess_jwt
    res.clearCookie('__chess_jwt', { httpOnly: true, sameSite: 'None', secure: true })

    const foundUser = await Player.findOne({ refreshToken }).exec()

    // Detected refresh token reuse!
    if (!foundUser) {
        try {
            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
                if (err) return res.sendStatus(403) //Forbidden
                console.log('attempted refresh token reuse!')
                const hackedUser = await Player.findOne({ username: decoded.username }).exec()
                hackedUser.refreshToken = []
                const result = await hackedUser.save()
                console.log(result)
            })
        } catch (err) {
            console.error('Error verifying refresh token:', err)
            return res.sendStatus(403) // Forbidden
        }
        return res.sendStatus(403) //Forbidden
    }

    const newRefreshTokenArray = foundUser.refreshToken.filter((rt) => rt !== refreshToken)
    const username = foundUser.username

    // evaluate jwt
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            foundUser.refreshToken = [...newRefreshTokenArray]
            const result = await foundUser.save()
        }
        if (err || username !== decoded.username) return res.sendStatus(403)

        // Refresh token was still valid
        const accessToken = jwt.sign({ username: decoded.username }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '15m',
        })

        const newRefreshToken = jwt.sign({ username: username }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '1d',
        })
        // Saving refreshToken with current user
        foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken]
        const result = await foundUser.save()

        res.cookie('__chess_jwt', newRefreshToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 24 * 60 * 60 * 1000,
        })

        res.json({ user: username, accessToken })
    })
}

export default { handleRefreshToken }
