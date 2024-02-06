import crypto from 'crypto'

function generateTokenSecret() {
    return crypto.randomBytes(32).toString('hex')
}

const accessTokenSecret = generateTokenSecret()
const refreshTokenSecret = generateTokenSecret()

console.log('Access Token Secret:', accessTokenSecret)
console.log('Refresh Token Secret:', refreshTokenSecret)
