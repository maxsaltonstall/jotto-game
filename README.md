# Jotto Word Guessing Game

A 2-player asynchronous word guessing game built with AWS serverless architecture.

## Game Rules

- Each player chooses a secret 5-letter word
- Players take turns guessing each other's word
- After each guess, they receive a count of how many letters match (position-independent)
- First player to guess the opponent's word wins

## Architecture

- **Frontend**: React + Vite (hosted on S3 + CloudFront)
- **Backend**: AWS Lambda + API Gateway
- **Database**: DynamoDB (single-table design)
- **Infrastructure**: AWS CDK with TypeScript

## Project Structure

```
jottogame/
├── backend/          # Lambda functions
├── frontend/         # React web application
└── infrastructure/   # AWS CDK stack
```

## Setup

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your AWS account details
   ```

3. **Deploy infrastructure**:
   ```bash
   npm run deploy:infra
   ```
   Note the API Gateway URL from the output.

4. **Update frontend config**:
   ```bash
   # Update .env with the API Gateway URL
   ```

5. **Run frontend locally**:
   ```bash
   npm run dev:frontend
   ```

## Development

- **Test backend**: `npm run test:backend`
- **Build backend**: `npm run build:backend`
- **Build frontend**: `npm run build:frontend`
- **Deploy infrastructure**: `npm run deploy:infra`

## API Endpoints

- `POST /games` - Create new game
- `POST /games/{gameId}/join` - Join existing game
- `GET /games` - List available games
- `GET /games/{gameId}` - Get game state
- `POST /games/{gameId}/guess` - Submit a guess

## Cost Estimate

MVP usage (< 100 games/day): ~$5/month

- DynamoDB: $0.01-0.10/day
- Lambda: Free tier
- API Gateway: $0.01-0.50/day
- S3 + CloudFront: $0.10-1.00/month

## Future Enhancements

- WebSocket support for real-time updates
- User authentication with Cognito
- Dictionary validation for words
- Leaderboard and statistics
- Mobile app version
