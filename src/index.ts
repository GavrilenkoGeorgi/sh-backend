import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import cors from 'cors'

// import session from 'express-session'

import connectDB from './config/db'
import { notFound, errorHandler } from './middleware/errorMiddleware'
import userRoutes from './routes/userRoutes'
import gameRoutes from './routes/gameRoutes'

dotenv.config()
const port = process.env.PORT || 5000

connectDB()

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/* app.use(
  session({
    secret: process.env.SESSION_SECRET || 'sdfhs7dn45nasd',
    resave: true,
    saveUninitialized: false,
    cookie: {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // must be 'none' to enable cross-site delivery
      secure: process.env.NODE_ENV === 'production', // must be true if sameSite='none'
    }
  })
); */

app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL
}))
// app.set('trust proxy', 1)

app.use('/api/users', userRoutes)
app.use('/api/game', gameRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(port, () => console.log(`Started on port ${port}`))
