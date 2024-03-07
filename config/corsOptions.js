export const allowedOrigins = [
    'https://chess-vite-client.vercel.app',
    'http://localhost:5173',
    'http://192.168.253.140:5173',
    'http://localhost:4242',
    'https://chess-server-8i1v.onrender.com',
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
