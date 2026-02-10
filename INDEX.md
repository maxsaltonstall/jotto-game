# Jotto Game - File Index

Quick reference guide to all important files in the project.

## 📚 Documentation

| File | Purpose |
|------|---------|
| [README.md](README.md) | Project overview, architecture, and introduction |
| [QUICK_START.md](QUICK_START.md) | 5-minute setup guide for local development |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Detailed AWS deployment instructions |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Complete feature list and technical details |
| [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) | Summary of what was built |
| [INDEX.md](INDEX.md) | This file - navigation guide |

## ⚙️ Backend

### Lambda Functions (API Handlers)
| File | Endpoint | Purpose |
|------|----------|---------|
| [createGame.ts](backend/src/functions/createGame.ts) | POST /games | Create new game |
| [joinGame.ts](backend/src/functions/joinGame.ts) | POST /games/{id}/join | Join existing game |
| [makeGuess.ts](backend/src/functions/makeGuess.ts) | POST /games/{id}/guess | Submit a guess |
| [getGameState.ts](backend/src/functions/getGameState.ts) | GET /games/{id} | Get game state |
| [listGames.ts](backend/src/functions/listGames.ts) | GET /games | List available games |

### Core Logic
| File | Purpose |
|------|---------|
| [GameService.ts](backend/src/services/GameService.ts) | Business logic for all game operations |
| [GameRepository.ts](backend/src/repositories/GameRepository.ts) | DynamoDB data access layer |
| [letterMatcher.ts](backend/src/utils/letterMatcher.ts) | Core game algorithm (letter matching) |
| [types.ts](backend/src/models/types.ts) | TypeScript type definitions |

### Utilities
| File | Purpose |
|------|---------|
| [response.ts](backend/src/utils/response.ts) | Lambda response helpers |
| [errors.ts](backend/src/utils/errors.ts) | Custom error classes |

### Tests
| File | Purpose |
|------|---------|
| [letterMatcher.test.ts](backend/tests/letterMatcher.test.ts) | Unit tests (16 test cases) |

## 🎨 Frontend

### Main Files
| File | Purpose |
|------|---------|
| [App.tsx](frontend/src/App.tsx) | Main application component |
| [App.css](frontend/src/App.css) | Global styles |
| [main.tsx](frontend/src/main.tsx) | React entry point |

### Components
| File | Purpose |
|------|---------|
| [CreateGame.tsx](frontend/src/components/CreateGame.tsx) | Form to create new game |
| [GameList.tsx](frontend/src/components/GameList.tsx) | Display available games |
| [GameBoard.tsx](frontend/src/components/GameBoard.tsx) | Main gameplay interface |
| [GuessInput.tsx](frontend/src/components/GuessInput.tsx) | Guess submission form |

### Hooks & API
| File | Purpose |
|------|---------|
| [usePolling.ts](frontend/src/hooks/usePolling.ts) | Custom hook for game state polling |
| [client.ts](frontend/src/api/client.ts) | API client wrapper |

## 🏗️ Infrastructure

| File | Purpose |
|------|---------|
| [jottogame-stack.ts](infrastructure/lib/jottogame-stack.ts) | Main CDK stack definition |
| [app.ts](infrastructure/bin/app.ts) | CDK app entry point |
| [cdk.json](infrastructure/cdk.json) | CDK configuration |

## ⚙️ Configuration

| File | Purpose |
|------|---------|
| [package.json](package.json) | Root workspace configuration |
| [backend/package.json](backend/package.json) | Backend dependencies |
| [frontend/package.json](frontend/package.json) | Frontend dependencies |
| [infrastructure/package.json](infrastructure/package.json) | Infrastructure dependencies |
| [.gitignore](.gitignore) | Git ignore rules |
| [.env.example](.env.example) | Environment variable template |

## 🔧 TypeScript Configuration

| File | Purpose |
|------|---------|
| [backend/tsconfig.json](backend/tsconfig.json) | Backend TS config |
| [frontend/tsconfig.json](frontend/tsconfig.json) | Frontend TS config |
| [frontend/tsconfig.node.json](frontend/tsconfig.node.json) | Frontend Node TS config |
| [infrastructure/tsconfig.json](infrastructure/tsconfig.json) | Infrastructure TS config |

## 🎯 Quick Navigation by Task

### "I want to understand how the game works"
1. Start with [README.md](README.md)
2. Read [letterMatcher.ts](backend/src/utils/letterMatcher.ts)
3. Check [letterMatcher.test.ts](backend/tests/letterMatcher.test.ts)

### "I want to deploy the game"
1. Follow [QUICK_START.md](QUICK_START.md) or [DEPLOYMENT.md](DEPLOYMENT.md)
2. Configure [.env](.env)
3. Run deployment commands

### "I want to modify the API"
1. Review [types.ts](backend/src/models/types.ts)
2. Edit [GameService.ts](backend/src/services/GameService.ts)
3. Update corresponding Lambda function in [functions/](backend/src/functions/)

### "I want to change the UI"
1. Edit components in [components/](frontend/src/components/)
2. Modify styles in [App.css](frontend/src/App.css)
3. Update [App.tsx](frontend/src/App.tsx) if changing layout

### "I want to add a new AWS resource"
1. Edit [jottogame-stack.ts](infrastructure/lib/jottogame-stack.ts)
2. Redeploy with `npm run deploy:infra`

### "I want to run tests"
```bash
cd backend
npm test
```
See [letterMatcher.test.ts](backend/tests/letterMatcher.test.ts)

### "I want to add a new feature"
1. Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture
2. Add backend logic in [GameService.ts](backend/src/services/GameService.ts)
3. Add Lambda function in [functions/](backend/src/functions/)
4. Add frontend component in [components/](frontend/src/components/)
5. Update [jottogame-stack.ts](infrastructure/lib/jottogame-stack.ts) if needed

## 📊 File Statistics

```
Total Files:     45+
TypeScript:      33 files
Documentation:   6 files
Configuration:   7 files
Tests:           1 file (16 tests)
```

## 🔑 Key Files by Importance

### Critical (Core Functionality)
1. [letterMatcher.ts](backend/src/utils/letterMatcher.ts) - Game algorithm
2. [GameService.ts](backend/src/services/GameService.ts) - Business logic
3. [GameRepository.ts](backend/src/repositories/GameRepository.ts) - Data access
4. [jottogame-stack.ts](infrastructure/lib/jottogame-stack.ts) - Infrastructure
5. [App.tsx](frontend/src/App.tsx) - UI entry point

### Important (API Layer)
6. [createGame.ts](backend/src/functions/createGame.ts)
7. [joinGame.ts](backend/src/functions/joinGame.ts)
8. [makeGuess.ts](backend/src/functions/makeGuess.ts)
9. [getGameState.ts](backend/src/functions/getGameState.ts)
10. [listGames.ts](backend/src/functions/listGames.ts)

### Supporting (UI Components)
11. [GameBoard.tsx](frontend/src/components/GameBoard.tsx)
12. [CreateGame.tsx](frontend/src/components/CreateGame.tsx)
13. [GameList.tsx](frontend/src/components/GameList.tsx)
14. [usePolling.ts](frontend/src/hooks/usePolling.ts)

## 🎓 Learning Path

### Beginner
1. [README.md](README.md) - Understand the project
2. [QUICK_START.md](QUICK_START.md) - Get it running
3. [letterMatcher.ts](backend/src/utils/letterMatcher.ts) - Core logic
4. [App.tsx](frontend/src/App.tsx) - UI overview

### Intermediate
5. [GameService.ts](backend/src/services/GameService.ts) - Business logic
6. [GameRepository.ts](backend/src/repositories/GameRepository.ts) - Data layer
7. [jottogame-stack.ts](infrastructure/lib/jottogame-stack.ts) - Infrastructure
8. [GameBoard.tsx](frontend/src/components/GameBoard.tsx) - Main UI

### Advanced
9. [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment
10. [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Architecture deep dive
11. Explore [types.ts](backend/src/models/types.ts) - Data modeling
12. Study [client.ts](frontend/src/api/client.ts) - API integration

---

Need help? Check the relevant documentation file above!
