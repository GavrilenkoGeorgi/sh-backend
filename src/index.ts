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

app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL
}))

app.use('/api/users', userRoutes)
app.use('/api/game', gameRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(port, () => console.log(`Started on port ${port}`))
