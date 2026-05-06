import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongo: MongoMemoryServer

export const connectTestDB = async () => {
  mongo = await MongoMemoryServer.create()
  const uri = mongo.getUri()

  await mongoose.connect(uri)
}

export const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
  await mongo.stop()
}

export const clearTestDB = async () => {
  const collections = mongoose.connection.collections

  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}
