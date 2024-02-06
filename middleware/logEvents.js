import { format } from 'date-fns'
import { v4 as uuid } from 'uuid'

import fs from 'fs'
import { promises as fsPromises } from 'fs'
import path from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

export const logEvents = async (message, logName) => {
    const dateFormat = format(new Date(), 'PPPPpppp')
    const dateTime = `${dateFormat}`
    const logItem = `${dateTime}\t\t${uuid()}\t${message}\n`

    const __dirname = dirname(fileURLToPath(import.meta.url))

    try {
        if (!fs.existsSync(path.join(__dirname, '..', 'logs'))) {
            await fsPromises.mkdir(path.join(__dirname, '..', 'logs'))
        }

        await fsPromises.appendFile(path.join(__dirname, '..', 'logs', logName), logItem)
    } catch (err) {
        console.log(err)
    }
}

export const logger = (req, res, next) => {
    logEvents(`${req.method}\t${req.headers.origin}\t${req.url}`, 'reqLog.txt')
    console.log(`${req.method} ${req.path}`)
    next()
}
