import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URL || '')
    console.log(`MongoDB connected: ${conn.connection.host}`)
  } catch (error: any ) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

export default connectDB
