import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';

export class JottoGameStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'GameTable', {
      tableName: 'JottoGameTable',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev/demo - use RETAIN in production
      pointInTimeRecovery: false // Enable in production
    });

    // GSI for listing games by status
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING }
    });

    // Datadog API Key in Secrets Manager
    const datadogApiKeySecret = new secretsmanager.Secret(this, 'DatadogApiKey', {
      secretName: 'jotto-game-datadog-api-key',
      description: 'Datadog API key for Lambda monitoring',
      secretStringValue: cdk.SecretValue.unsafePlainText('PLACEHOLDER-UPDATE-WITH-YOUR-DATADOG-API-KEY')
    });

    // Datadog Lambda Layer (Node.js 20.x for us-east-1)
    const datadogLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'DatadogLayer',
      `arn:aws:lambda:${this.region}:464622532012:layer:Datadog-Node20-x:113`
    );

    // Common Lambda configuration
    const lambdaEnvironment = {
      TABLE_NAME: table.tableName,
      NODE_OPTIONS: '--enable-source-maps',
      // Datadog configuration
      DD_SITE: 'us5.datadoghq.com',
      DD_API_KEY_SECRET_ARN: datadogApiKeySecret.secretArn,
      DD_FLUSH_TO_LOG: 'true',
      DD_TRACE_ENABLED: 'true',
      DD_LOGS_INJECTION: 'true',
      DD_SERVICE: 'jotto-game',
      DD_ENV: 'production'
    };

    const lambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      layers: [datadogLayer]
    };

    // Lambda code including node_modules
    const lambdaCode = lambda.Code.fromAsset(path.join(__dirname, '../../backend'), {
      exclude: ['tests', 'src', 'tsconfig.json', 'vitest.config.ts', '*.md']
    });

    // Lambda Functions
    const createGameFn = new lambda.Function(this, 'CreateGameFunction', {
      ...lambdaProps,
      code: lambdaCode,
      handler: 'dist/functions/createGame.handler',
      description: 'Create a new Jotto game'
    });

    const joinGameFn = new lambda.Function(this, 'JoinGameFunction', {
      ...lambdaProps,
      code: lambdaCode,
      handler: 'dist/functions/joinGame.handler',
      description: 'Join an existing Jotto game'
    });

    const makeGuessFn = new lambda.Function(this, 'MakeGuessFunction', {
      ...lambdaProps,
      code: lambdaCode,
      handler: 'dist/functions/makeGuess.handler',
      description: 'Make a guess in a Jotto game'
    });

    const getGameStateFn = new lambda.Function(this, 'GetGameStateFunction', {
      ...lambdaProps,
      code: lambdaCode,
      handler: 'dist/functions/getGameState.handler',
      description: 'Get the current state of a Jotto game'
    });

    const listGamesFn = new lambda.Function(this, 'ListGamesFunction', {
      ...lambdaProps,
      code: lambdaCode,
      handler: 'dist/functions/listGames.handler',
      description: 'List available Jotto games'
    });

    const createAIGameFn = new lambda.Function(this, 'CreateAIGameFunction', {
      ...lambdaProps,
      code: lambdaCode,
      handler: 'dist/functions/createAIGame.handler',
      description: 'Create a game against AI opponent'
    });

    // Auth Lambda Functions
    const registerFn = new lambda.Function(this, 'RegisterFunction', {
      ...lambdaProps,
      code: lambdaCode,
      handler: 'dist/functions/register.handler',
      description: 'Register a new user',
      environment: {
        ...lambdaEnvironment,
        JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      }
    });

    const loginFn = new lambda.Function(this, 'LoginFunction', {
      ...lambdaProps,
      code: lambdaCode,
      handler: 'dist/functions/login.handler',
      description: 'Login user',
      environment: {
        ...lambdaEnvironment,
        JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      }
    });

    const getStatsFn = new lambda.Function(this, 'GetStatsFunction', {
      ...lambdaProps,
      code: lambdaCode,
      handler: 'dist/functions/getStats.handler',
      description: 'Get user stats'
    });

    // Grant DynamoDB permissions
    table.grantReadWriteData(createGameFn);
    table.grantReadWriteData(joinGameFn);
    table.grantReadWriteData(makeGuessFn);
    table.grantReadData(getGameStateFn);
    table.grantReadData(listGamesFn);
    table.grantReadWriteData(createAIGameFn);
    table.grantReadWriteData(registerFn);
    table.grantReadWriteData(loginFn);
    table.grantReadData(getStatsFn);

    // Grant Secrets Manager read permissions for Datadog API key
    datadogApiKeySecret.grantRead(createGameFn);
    datadogApiKeySecret.grantRead(joinGameFn);
    datadogApiKeySecret.grantRead(makeGuessFn);
    datadogApiKeySecret.grantRead(getGameStateFn);
    datadogApiKeySecret.grantRead(createAIGameFn);
    datadogApiKeySecret.grantRead(listGamesFn);
    datadogApiKeySecret.grantRead(registerFn);
    datadogApiKeySecret.grantRead(loginFn);
    datadogApiKeySecret.grantRead(getStatsFn);

    // API Gateway
    const api = new apigateway.RestApi(this, 'JottoApi', {
      restApiName: 'Jotto Game API',
      description: 'API for Jotto word guessing game',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      },
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200
      }
    });

    // API Resources and Methods
    const games = api.root.addResource('games');

    // POST /games - Create game
    games.addMethod('POST', new apigateway.LambdaIntegration(createGameFn));

    // GET /games - List games
    games.addMethod('GET', new apigateway.LambdaIntegration(listGamesFn));

    // /games/{gameId}
    const game = games.addResource('{gameId}');

    // GET /games/{gameId} - Get game state
    game.addMethod('GET', new apigateway.LambdaIntegration(getGameStateFn));

    // POST /games/{gameId}/join - Join game
    const join = game.addResource('join');
    join.addMethod('POST', new apigateway.LambdaIntegration(joinGameFn));

    // POST /games/{gameId}/guess - Make guess
    const guess = game.addResource('guess');
    guess.addMethod('POST', new apigateway.LambdaIntegration(makeGuessFn));

    // POST /ai-game - Create AI opponent game
    const aiGame = api.root.addResource('ai-game');
    aiGame.addMethod('POST', new apigateway.LambdaIntegration(createAIGameFn));

    // /auth endpoints
    const auth = api.root.addResource('auth');

    // POST /auth/register - Register user
    const register = auth.addResource('register');
    register.addMethod('POST', new apigateway.LambdaIntegration(registerFn));

    // POST /auth/login - Login user
    const login = auth.addResource('login');
    login.addMethod('POST', new apigateway.LambdaIntegration(loginFn));

    // GET /auth/stats - Get user stats
    const stats = auth.addResource('stats');
    stats.addMethod('GET', new apigateway.LambdaIntegration(getStatsFn));

    // S3 Bucket for frontend hosting (private, accessed via CloudFront)
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `jotto-game-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // CloudFront Origin Access Identity for secure S3 access
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for ${websiteBucket.bucketName}`
    });

    // Grant CloudFront read access to the bucket
    websiteBucket.grantRead(originAccessIdentity);

    // Route53 Hosted Zone
    const hostedZone = new route53.PublicHostedZone(this, 'HostedZone', {
      zoneName: 'maxsaltonstall.com'
    });

    // ACM Certificate for custom domain (must be in us-east-1 for CloudFront)
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: 'jotto.maxsaltonstall.com',
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      certificate: certificate,
      domainNames: ['jotto.maxsaltonstall.com'],
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity: originAccessIdentity
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5)
        }
      ]
    });

    // Route53 A Record pointing to CloudFront
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: 'jotto',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'JottoGameApiUrl'
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB Table Name'
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 bucket for frontend hosting'
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'Website URL (S3)'
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Website URL (CloudFront)'
    });

    new cdk.CfnOutput(this, 'CustomDomainUrl', {
      value: 'https://jotto.maxsaltonstall.com',
      description: 'Custom Domain URL'
    });

    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', hostedZone.hostedZoneNameServers || []),
      description: 'Route53 Name Servers - Update these at your domain registrar'
    });
  }
}
