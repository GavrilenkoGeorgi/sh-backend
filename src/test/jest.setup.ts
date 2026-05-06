import { connectTestDB, disconnectTestDB, clearTestDB } from './setup'
import { beforeAll, afterAll, afterEach } from '@jest/globals'
// global env vars used by services during tests
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.JWT_REFRESH = 'test-jwt-refresh-secret'
process.env.API_URL = 'http://localhost:3001'
process.env.CLIENT_URL = 'http://localhost:3000'

beforeAll(async () => {
  await connectTestDB()
})

afterEach(async () => {
  await clearTestDB()
})

afterAll(async () => {
  await disconnectTestDB()
})
