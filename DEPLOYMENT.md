# Deployment Guide

This guide walks you through deploying the Jotto game to AWS.

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **AWS CLI**: Install and configure with your credentials
   ```bash
   aws configure
   ```
3. **Node.js**: Version 18 or higher
4. **AWS CDK**: Will be installed as part of dependencies

## Step-by-Step Deployment

### 1. Install Dependencies

From the root directory:

```bash
npm install
```

This will install dependencies for all workspaces (backend, frontend, infrastructure).

### 2. Run Backend Tests

Verify the core game logic works correctly:

```bash
cd backend
npm test
```

All tests should pass. Example output:
```
✓ countCommonLetters > counts exact matches correctly
✓ countCommonLetters > counts partial matches correctly
...
Test Files  1 passed (1)
Tests  15 passed (15)
```

### 3. Build Backend

Compile the TypeScript backend code:

```bash
cd backend
npm run build
```

This creates the `dist/` folder with compiled JavaScript that Lambda will run.

### 4. Bootstrap CDK (First Time Only)

If this is your first time using CDK in this AWS account/region:

```bash
cd infrastructure
npx cdk bootstrap
```

This sets up the necessary S3 bucket and roles for CDK deployments.

### 5. Deploy Infrastructure

```bash
cd infrastructure
npm run deploy
```

This will:
- Create DynamoDB table
- Deploy Lambda functions
- Set up API Gateway
- Create S3 bucket for frontend
- Set up CloudFront distribution

The deployment takes 3-5 minutes. At the end, you'll see outputs like:

```
Outputs:
JottoGameStack.ApiUrl = https://abc123.execute-api.us-east-1.amazonaws.com/prod/
JottoGameStack.CloudFrontUrl = https://d1234abcd.cloudfront.net
JottoGameStack.WebsiteBucketName = jotto-game-123456789012-us-east-1
```

**Important**: Copy the `ApiUrl` value - you'll need it for the frontend.

### 6. Configure Frontend

Create a `.env` file in the frontend directory:

```bash
cd frontend
cat > .env << EOF
VITE_API_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod
EOF
```

Replace `YOUR-API-ID` with the actual API URL from the CDK output.

### 7. Build Frontend

```bash
cd frontend
npm run build
```

This creates the `dist/` folder with the production build.

### 8. Deploy Frontend to S3

```bash
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/
```

Replace `YOUR-BUCKET-NAME` with the `WebsiteBucketName` from CDK outputs.

Alternative using AWS CLI profile:

```bash
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/ --profile your-profile-name
```

### 9. Test the Application

Open the CloudFront URL in your browser:

```
https://d1234abcd.cloudfront.net
```

Or use the S3 website URL from the outputs for faster testing (no CDN caching):

```
http://jotto-game-123456789012-us-east-1.s3-website-us-east-1.amazonaws.com
```

## Testing the Deployment

### Manual Testing

1. **Create a game**:
   - Enter a 5-letter secret word
   - Click "Create Game"
   - Note the Game ID

2. **Join the game** (in another browser/incognito window):
   - You should see the game in the "Available Games" list
   - Click "Join"
   - Enter your secret word

3. **Play the game**:
   - Take turns guessing words
   - Verify match counts are correct
   - Verify the winner is detected correctly

### API Testing with curl

Test the API directly:

```bash
# Set your API URL
API_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod

# Create a game
curl -X POST $API_URL/games \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player1","secretWord":"CHARM"}'

# List games (should see the game you just created)
curl $API_URL/games?status=WAITING

# Join game (use the gameId from create response)
curl -X POST $API_URL/games/GAME-ID-HERE/join \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player2","secretWord":"BREAD"}'

# Make a guess
curl -X POST $API_URL/games/GAME-ID-HERE/guess \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player1","guessWord":"BREAD"}'

# Get game state
curl "$API_URL/games/GAME-ID-HERE?playerId=player1"
```

## Updating the Application

### Update Backend

```bash
cd backend
npm run build
cd ../infrastructure
npm run deploy
```

CDK will only update the changed Lambda functions.

### Update Frontend

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/
```

If using CloudFront, invalidate the cache for immediate updates:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR-DISTRIBUTION-ID \
  --paths "/*"
```

Get the distribution ID from CDK outputs or the CloudFront console.

## Monitoring

### CloudWatch Logs

Lambda logs are automatically sent to CloudWatch:

```bash
aws logs tail /aws/lambda/JottoGameStack-CreateGameFunction --follow
```

### DynamoDB Metrics

View table metrics in the AWS Console:
- Console → DynamoDB → Tables → JottoGameTable → Metrics

### API Gateway Metrics

View API metrics:
- Console → API Gateway → JottoApi → Dashboard

## Cost Management

### Current Usage Estimation

For < 100 games/day:
- **DynamoDB**: ~$0.01-0.10/day (pay-per-request)
- **Lambda**: Free tier (1M requests/month)
- **API Gateway**: ~$0.01-0.50/day
- **S3**: ~$0.10/month
- **CloudFront**: ~$0.10-1.00/month

**Total**: ~$5-10/month

### Set Up Billing Alerts

1. Go to AWS Billing Dashboard
2. Create a billing alarm for $10/month threshold
3. Get notified if costs exceed expectations

## Teardown

To delete all resources:

```bash
cd infrastructure
npm run destroy
```

This removes:
- All Lambda functions
- API Gateway
- DynamoDB table (including all data)
- S3 bucket (including website files)
- CloudFront distribution

**Warning**: This is irreversible. All game data will be lost.

## Troubleshooting

### Lambda Function Errors

Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/FUNCTION-NAME --follow
```

### CORS Errors

If you see CORS errors in the browser console:
1. Verify the API Gateway CORS settings in `infrastructure/lib/jottogame-stack.ts`
2. Redeploy: `cd infrastructure && npm run deploy`

### DynamoDB Access Denied

Verify Lambda has correct IAM permissions:
```bash
aws lambda get-policy --function-name JottoGameStack-CreateGameFunction
```

### Frontend Not Loading

1. Verify S3 bucket public access settings
2. Check CloudFront distribution status (wait for "Deployed")
3. Try the S3 website URL directly

### API Returns 500 Errors

1. Check Lambda logs in CloudWatch
2. Verify environment variable `TABLE_NAME` is set
3. Ensure DynamoDB table exists and is active

## Production Considerations

Before going to production, consider:

1. **Custom Domain**: Set up Route53 and ACM certificate
2. **Authentication**: Add Cognito user pools
3. **Monitoring**: Set up CloudWatch dashboards and alarms
4. **Backups**: Enable DynamoDB point-in-time recovery
5. **Rate Limiting**: Configure API Gateway throttling per user
6. **WAF**: Add AWS WAF for DDoS protection
7. **Environment Variables**: Use AWS Systems Manager Parameter Store for secrets
8. **CI/CD**: Set up GitHub Actions or AWS CodePipeline for automated deployments

## Support

For issues or questions:
- Check CloudWatch Logs first
- Review the API with curl to isolate frontend vs backend issues
- Verify all environment variables are set correctly
