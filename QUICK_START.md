# Quick Start Guide

Get the Jotto game running locally in 5 minutes!

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

This installs dependencies for all three workspaces (backend, frontend, infrastructure).

### 2. Test the Backend

```bash
cd backend
npm test
```

You should see all tests pass:
```
✓ countCommonLetters (8 tests)
✓ isValidWord (5 tests)
✓ normalizeWord (3 tests)
```

### 3. Run Frontend Locally (Mock Backend)

For quick local testing without AWS:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

**Note**: This will show connection errors since there's no backend yet. To test the full app, you need to deploy to AWS (see below).

## Deploy to AWS

### Prerequisites
- AWS account with CLI configured (`aws configure`)
- AWS permissions for Lambda, DynamoDB, API Gateway, S3

### Quick Deploy

```bash
# 1. Build backend
cd backend
npm run build

# 2. Deploy infrastructure (takes ~5 minutes)
cd ../infrastructure
npm run deploy

# 3. Copy the API URL from output, then configure frontend
cd ../frontend
echo "VITE_API_URL=https://YOUR-API-URL-HERE/prod" > .env

# 4. Build and deploy frontend
npm run build
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/

# 5. Open the CloudFront URL from the deployment output
```

## Project Structure

```
jottogame/
├── backend/              # Lambda functions
│   ├── src/
│   │   ├── functions/    # API handlers
│   │   ├── services/     # Business logic
│   │   ├── repositories/ # DynamoDB access
│   │   ├── models/       # TypeScript types
│   │   └── utils/        # Helper functions
│   └── tests/            # Unit tests
│
├── frontend/             # React app
│   └── src/
│       ├── components/   # UI components
│       ├── hooks/        # Custom React hooks
│       └── api/          # API client
│
└── infrastructure/       # AWS CDK
    └── lib/              # Stack definition
```

## Development Workflow

### Making Changes to Backend

```bash
cd backend

# Run tests
npm test

# Build
npm run build

# Deploy
cd ../infrastructure
npm run deploy
```

### Making Changes to Frontend

```bash
cd frontend

# Run dev server
npm run dev

# Build for production
npm run build

# Deploy to S3
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/
```

### View Logs

```bash
# Lambda logs
aws logs tail /aws/lambda/JottoGameStack-CreateGameFunction --follow

# All Lambda functions
aws logs tail /aws/lambda/JottoGameStack --follow
```

## Common Commands

```bash
# Install all dependencies
npm install

# Test backend
npm run test:backend

# Build everything
npm run build:backend
npm run build:frontend
npm run build:infra

# Deploy infrastructure
npm run deploy:infra

# Run frontend locally
npm run dev:frontend
```

## API Endpoints

Base URL: `https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod`

- `POST /games` - Create new game
  ```json
  {"playerId": "player1", "secretWord": "CHARM"}
  ```

- `GET /games?status=WAITING` - List available games

- `POST /games/{gameId}/join` - Join game
  ```json
  {"playerId": "player2", "secretWord": "BREAD"}
  ```

- `GET /games/{gameId}?playerId=player1` - Get game state

- `POST /games/{gameId}/guess` - Make guess
  ```json
  {"playerId": "player1", "guessWord": "BREAD"}
  ```

## Testing the Game

1. **Create a game**:
   - Open the app
   - Enter a 5-letter word (e.g., "CHARM")
   - Click "Create Game"

2. **Join in another browser**:
   - Open the app in incognito/private mode
   - Click on the available game
   - Enter your secret word (e.g., "BREAD")

3. **Play**:
   - Take turns guessing
   - Match counts show how many letters are correct
   - First to guess correctly wins!

## Troubleshooting

### "Failed to fetch" errors
- Backend not deployed yet → Deploy with `npm run deploy:infra`
- Wrong API URL → Check `.env` in frontend folder

### "Validation error" when creating game
- Word must be exactly 5 letters
- Only letters A-Z allowed

### "Not your turn" error
- Wait for opponent to guess
- Game alternates turns automatically

### Deployment fails
- Check AWS credentials: `aws sts get-caller-identity`
- Ensure you have necessary permissions
- Try `cdk bootstrap` if first time deploying

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guide
- Check [README.md](README.md) for architecture overview
- Add custom domain, authentication, or other enhancements

## Clean Up

To delete all AWS resources:

```bash
cd infrastructure
npm run destroy
```

**Warning**: This deletes all data permanently!
