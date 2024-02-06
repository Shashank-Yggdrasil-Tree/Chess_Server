export const allowedOrigins = [
    'https://chess-vite-client.vercel.app',
    'https://chess-vite-client.vercel.app/playvfriend',
    'http://localhost:5173',
]

export const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
}
