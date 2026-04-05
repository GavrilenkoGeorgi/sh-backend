# Sh Backend

Backend API and real-time multiplayer server for the Sharlushka project.

## Project Overview

This repository contains the Node.js + TypeScript backend for:

- user authentication and session flow with JWT cookies
- email flows (account activation and password recovery)
- classic single-player result storage
- multiplayer real-time game flow over Socket.IO

Frontend app:

- production frontend: https://sharlushka.netlify.app
- staging frontend (current configured URL): https://staging--sharlushka.netlify.app

## Core Tech Stack

- Node.js
- TypeScript
- Express
- Socket.IO
- MongoDB + Mongoose

## Latest Backend Changes

Multiplayer includes:

- invite APIs and socket flows (incoming/outgoing/pending)
- multiplayer game lifecycle events
- turn submission validation and server-authoritative turn order
- game completion and game-ended events
- disconnect handling that ends active games
- multiplayer result persistence for ended games

## Packages Used

### Runtime dependencies

- bcryptjs
- cookie-parser
- cors
- dotenv
- express
- express-async-handler
- jsonwebtoken
- mongoose
- nodemailer
- socket.io
- uuid
- zod

### Development dependencies

- typescript
- nodemon
- concurrently
- @types/bcryptjs
- @types/cookie-parser
- @types/cors
- @types/express
- @types/jsonwebtoken
- @types/nodemailer
- @types/uuid

## API Overview

Base paths:

- /users
- /game
- /multiplayer

Multiplayer REST endpoints currently available:

- GET /multiplayer/invites/incoming
- GET /multiplayer/invites/outgoing
- GET /multiplayer/results

Multiplayer real-time events include:

- presence:online-users
- invite:send, invite:accept, invite:decline
- invite:received, invite:status
- game:started
- game:submit-turn
- game:state-updated
- game:ended

## Local Development

### Install

```bash
npm install
```

### Run in development mode

```bash
npm run dev
```

The dev script compiles TypeScript in watch mode and runs the built server with nodemon.

### Build and run

```bash
npm run build
npm start
```

### SMTP credential check

```bash
npm run test-email
```

## Branches, Staging, and Heroku Pipeline

This repo uses a two-branch delivery flow with Heroku pipeline environments:

- main branch: production lane
- staging branch: pre-production lane

Suggested environment mapping:

- staging branch -> Heroku staging app -> staging frontend
- main branch -> Heroku production app -> production frontend

Typical flow:

1. Work lands on staging first for verification.
2. Staging deploy validates API behavior and multiplayer changes.
3. Merge/promote to main after validation.
4. Main deploys to production.

Staging setup provides smooth delivery process:

- safer rollouts before production
- cleaner release confidence for realtime/gameplay changes
- easier debugging and regression checks in an environment close to production

## Deployment Notes

- Backend deploy target: Heroku (pipeline-based)
- Frontend deploy target: Netlify
- Ensure CLIENT_URL matches the frontend environment (staging vs production)
- Ensure API_URL is aligned with the backend app URL per environment
