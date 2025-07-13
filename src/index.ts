import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import cors from 'cors'

import connectDB from './config/db'
import { notFound, errorHandler } from './middleware/errorMiddleware'
import userRoutes from './routes/userRoutes'
import gameRoutes from './routes/gameRoutes'
import { API_BASE_PATHS } from './constants/routes'

dotenv.config()
const port = process.env.PORT || 5000

connectDB()

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(API_BASE_PATHS.USERS, userRoutes)
app.use(API_BASE_PATHS.GAME, gameRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(port, () => console.log(`Started on port ${port}`))
