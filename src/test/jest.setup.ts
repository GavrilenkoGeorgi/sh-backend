// global env vars used by services during tests
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.JWT_REFRESH = 'test-jwt-refresh-secret'
process.env.API_URL = 'http://localhost:3001'
process.env.CLIENT_URL = 'http://localhost:3000'

// in-memory mongo is opt-in: call connectTestDB/clearTestDB/disconnectTestDB
// from ./setup in the test files that need a real db (current tests mock models)
