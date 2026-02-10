#!/bin/bash

# Jotto Game AWS Deployment Script
# Run this in your terminal: bash DEPLOY.sh

set -e

# Add Homebrew to PATH (for npm/node)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           Deploying Jotto Game to AWS                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo

# Verify AWS credentials
echo "Step 1: Verifying AWS credentials..."
AWS_ACCOUNT=$(aws sts get-caller-identity --profile account-admin-148203325623 --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
echo "✓ AWS Account: $AWS_ACCOUNT"
echo "✓ AWS Region: $AWS_REGION"
echo

# Step 2: Build backend
echo "Step 2: Building backend..."
cd /Users/max.saltonstall/jottogame/backend
/opt/homebrew/bin/npm run build
echo "✓ Backend built successfully!"
echo

# Step 3: Bootstrap CDK (if needed)
echo "Step 3: Bootstrapping CDK (first time only)..."
cd /Users/max.saltonstall/jottogame/infrastructure
npx cdk bootstrap --profile account-admin-148203325623 --require-approval never || echo "Already bootstrapped or error occurred"
echo

# Step 4: Deploy infrastructure
echo "Step 4: Deploying infrastructure to AWS..."
echo "This will take 5-8 minutes..."
echo
npx cdk deploy --profile account-admin-148203325623 --require-approval never --outputs-file cdk-outputs.json

if [ -f cdk-outputs.json ]; then
    echo
    echo "✓ Infrastructure deployed successfully!"
    echo

    # Extract outputs
    API_URL=$(cat cdk-outputs.json | grep -o '"ApiUrl": "[^"]*' | cut -d'"' -f4)
    CLOUDFRONT_URL=$(cat cdk-outputs.json | grep -o '"CloudFrontUrl": "[^"]*' | cut -d'"' -f4)
    BUCKET_NAME=$(cat cdk-outputs.json | grep -o '"WebsiteBucketName": "[^"]*' | cut -d'"' -f4)

    echo "═══════════════════════════════════════════════════════════"
    echo "AWS Resources Created:"
    echo "  API URL: $API_URL"
    echo "  CloudFront URL: $CLOUDFRONT_URL"
    echo "  S3 Bucket: $BUCKET_NAME"
    echo "═══════════════════════════════════════════════════════════"
    echo

    # Step 5: Configure frontend
    echo "Step 5: Configuring frontend..."
    cd /Users/max.saltonstall/jottogame/frontend
    echo "VITE_API_URL=$API_URL" > .env
    echo "✓ Frontend configured with API URL"
    echo

    # Step 6: Build frontend
    echo "Step 6: Building frontend..."
    /opt/homebrew/bin/npm run build
    echo "✓ Frontend built successfully!"
    echo

    # Step 7: Deploy frontend to S3
    echo "Step 7: Deploying frontend to S3..."
    aws s3 sync dist/ s3://$BUCKET_NAME/ --profile account-admin-148203325623 --delete
    echo "✓ Frontend deployed to S3!"
    echo

    # Success!
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              Deployment Complete! 🎉                       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo
    echo "Your Jotto game is live at:"
    echo "  $CLOUDFRONT_URL"
    echo
    echo "API Endpoint:"
    echo "  $API_URL"
    echo
    echo "Next steps:"
    echo "  1. Open $CLOUDFRONT_URL in your browser"
    echo "  2. Create a game and play!"
    echo "  3. Share the URL with friends"
    echo
    echo "To update the game:"
    echo "  - Backend: cd backend && npm run build && cd ../infrastructure && npx cdk deploy"
    echo "  - Frontend: cd frontend && npm run build && aws s3 sync dist/ s3://$BUCKET_NAME/"
    echo
    echo "To remove everything:"
    echo "  cd infrastructure && npx cdk destroy"
    echo
else
    echo "❌ Deployment failed. Check the errors above."
    exit 1
fi
