import mongoose from 'mongoose'

const connectDB = async () => {
  const dbUrl = process.env.DB_URL
  if (!dbUrl) {
    console.error('DB_URL is not defined in environment variables')
    process.exit(1)
  }

  try {
    const conn = await mongoose.connect(dbUrl, { dbName: process.env.DB_NAME })
    console.log(`MongoDB connected: ${conn.connection.host}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Error: ${message}`)
    process.exit(1)
  }
}

export default connectDB
