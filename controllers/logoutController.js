import Player from '../model/Player.js'

const handleLogout = async (req, res) => {
    // On client, also delete the accessToken
    const cookies = req.cookies
    console.log(cookies)
    if (!cookies?.__chess_jwt) return res.sendStatus(204) //No content
    const refreshToken = cookies.__chess_jwt

    // Is refreshToken in db?
    const foundUser = await Player.findOne({ refreshToken }).exec()
    if (!foundUser) {
        res.clearCookie('__chess_jwt', {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
        })
        return res.sendStatus(204)
    }

    // Delete refreshToken in db
    foundUser.refreshToken = foundUser.refreshToken.filter((rt) => rt !== refreshToken)
    const result = await foundUser.save()
    console.log(result)

    res.clearCookie('__chess_jwt', { httpOnly: true, sameSite: 'None', secure: true })
    res.sendStatus(204)
}

export default { handleLogout }
