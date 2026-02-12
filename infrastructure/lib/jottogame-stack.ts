import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
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
import { WebSocketApi } from './constructs/websocket-api.js';

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

    // Datadog Lambda Library Layer (Node.js 20.x for us-east-1)
    const datadogLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'DatadogLayer',
      `arn:aws:lambda:${this.region}:464622532012:layer:Datadog-Node20-x:133`
    );

    // Datadog Extension Layer (required for efficient telemetry collection)
    const datadogExtension = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'DatadogExtension',
      `arn:aws:lambda:${this.region}:464622532012:layer:Datadog-Extension:90`
    );

    // Common Lambda configuration
    const lambdaEnvironment = {
      TABLE_NAME: table.tableName,
      NODE_OPTIONS: '--enable-source-maps',
      // Anthropic API key for LLM-powered AI
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      // Datadog configuration (using Extension for efficient telemetry collection)
      DD_SITE: 'us5.datadoghq.com',
      DD_API_KEY_SECRET_ARN: datadogApiKeySecret.secretArn,
      DD_FLUSH_TO_LOG: 'false', // false when using Extension (sends directly to Datadog)
      DD_TRACE_ENABLED: 'true',
      DD_LOGS_INJECTION: 'true',
      DD_SERVICE: 'jotto-game',
      DD_ENV: 'production',
      DD_VERSION: '1.0.0' // Add version tagging for better tracking
    };

    const lambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      layers: [datadogLayer, datadogExtension]
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

    const cleanupGamesFn = new lambda.Function(this, 'CleanupGamesFunction', {
      ...lambdaProps,
      code: lambdaCode,
      handler: 'dist/functions/cleanupGames.handler',
      description: 'Cleanup old/inactive games (admin only)',
      timeout: cdk.Duration.minutes(5), // Longer timeout for cleanup
      environment: {
        ...lambdaProps.environment,
        ADMIN_SECRET: process.env.ADMIN_SECRET || 'change-me-in-production'
      }
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
    table.grantReadWriteData(cleanupGamesFn); // Full access for deletion

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
        throttlingBurstLimit: 200,
        // Enable caching to reduce Lambda invocations
        cachingEnabled: true,
        cacheClusterEnabled: true,
        cacheClusterSize: '0.5', // 0.5GB cache - smallest size ($0.02/hour = ~$15/month)
        cacheTtl: cdk.Duration.seconds(10), // Cache for 10 seconds by default
        cacheDataEncrypted: true
      }
    });

    // API Resources and Methods
    const games = api.root.addResource('games');

    // POST /games - Create game
    games.addMethod('POST', new apigateway.LambdaIntegration(createGameFn));

    // GET /games - List games (with caching)
    games.addMethod('GET', new apigateway.LambdaIntegration(listGamesFn), {
      requestParameters: {
        'method.request.querystring.status': false
      },
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Cache-Control': true
        }
      }]
    });

    // /games/{gameId}
    const game = games.addResource('{gameId}');

    // GET /games/{gameId} - Get game state (with caching)
    game.addMethod('GET', new apigateway.LambdaIntegration(getGameStateFn), {
      requestParameters: {
        'method.request.path.gameId': true,
        'method.request.querystring.playerId': false
      },
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Cache-Control': true
        }
      }]
    });

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

    // HTTP API (v2) - 40% cheaper than REST API, but no native caching
    // We rely on React Query client-side caching and CloudFront edge caching instead
    const httpApi = new apigatewayv2.HttpApi(this, 'JottoHttpApi', {
      apiName: 'Jotto Game HTTP API',
      description: 'HTTP API for Jotto word guessing game (cheaper than REST API)',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.hours(1)
      }
    });

    // Create Lambda integrations
    const createGameIntegration = new HttpLambdaIntegration('CreateGameIntegration', createGameFn);
    const listGamesIntegration = new HttpLambdaIntegration('ListGamesIntegration', listGamesFn);
    const getGameStateIntegration = new HttpLambdaIntegration('GetGameStateIntegration', getGameStateFn);
    const joinGameIntegration = new HttpLambdaIntegration('JoinGameIntegration', joinGameFn);
    const makeGuessIntegration = new HttpLambdaIntegration('MakeGuessIntegration', makeGuessFn);
    const createAIGameIntegration = new HttpLambdaIntegration('CreateAIGameIntegration', createAIGameFn);
    const registerIntegration = new HttpLambdaIntegration('RegisterIntegration', registerFn);
    const loginIntegration = new HttpLambdaIntegration('LoginIntegration', loginFn);
    const getStatsIntegration = new HttpLambdaIntegration('GetStatsIntegration', getStatsFn);
    const cleanupGamesIntegration = new HttpLambdaIntegration('CleanupGamesIntegration', cleanupGamesFn);

    // Add routes
    httpApi.addRoutes({
      path: '/games',
      methods: [HttpMethod.POST],
      integration: createGameIntegration
    });

    httpApi.addRoutes({
      path: '/games',
      methods: [HttpMethod.GET],
      integration: listGamesIntegration
    });

    httpApi.addRoutes({
      path: '/games/{gameId}',
      methods: [HttpMethod.GET],
      integration: getGameStateIntegration
    });

    httpApi.addRoutes({
      path: '/games/{gameId}/join',
      methods: [HttpMethod.POST],
      integration: joinGameIntegration
    });

    httpApi.addRoutes({
      path: '/games/{gameId}/guess',
      methods: [HttpMethod.POST],
      integration: makeGuessIntegration
    });

    httpApi.addRoutes({
      path: '/ai-game',
      methods: [HttpMethod.POST],
      integration: createAIGameIntegration
    });

    httpApi.addRoutes({
      path: '/auth/register',
      methods: [HttpMethod.POST],
      integration: registerIntegration
    });

    httpApi.addRoutes({
      path: '/auth/login',
      methods: [HttpMethod.POST],
      integration: loginIntegration
    });

    httpApi.addRoutes({
      path: '/auth/stats',
      methods: [HttpMethod.GET],
      integration: getStatsIntegration
    });

    httpApi.addRoutes({
      path: '/admin/cleanup-games',
      methods: [HttpMethod.POST, HttpMethod.DELETE],
      integration: cleanupGamesIntegration
    });

    // WebSocket API - RECREATED FRESH
    const webSocketApi = new WebSocketApi(this, 'WebSocketApi', {
      gameTable: table,
      lambdaCode: lambdaCode,
      lambdaProps: lambdaProps,
      datadogApiKeySecret: datadogApiKeySecret
    });

    // Grant WebSocket management permissions to game Lambda functions
    webSocketApi.webSocketApi.grantManageConnections(makeGuessFn);
    webSocketApi.webSocketApi.grantManageConnections(joinGameFn);
    webSocketApi.webSocketApi.grantManageConnections(createAIGameFn);

    // Add WebSocket connection table access for game functions
    webSocketApi.connectionsTable.grantReadData(makeGuessFn);
    webSocketApi.connectionsTable.grantReadData(joinGameFn);
    webSocketApi.connectionsTable.grantReadData(createAIGameFn);

    // Add WebSocket endpoint to environment variables
    const webSocketCallbackUrl = `https://${webSocketApi.webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/prod`;
    makeGuessFn.addEnvironment('WEBSOCKET_API_ENDPOINT', webSocketCallbackUrl);
    makeGuessFn.addEnvironment('CONNECTIONS_TABLE_NAME', webSocketApi.connectionsTable.tableName);
    joinGameFn.addEnvironment('WEBSOCKET_API_ENDPOINT', webSocketCallbackUrl);
    joinGameFn.addEnvironment('CONNECTIONS_TABLE_NAME', webSocketApi.connectionsTable.tableName);
    createAIGameFn.addEnvironment('WEBSOCKET_API_ENDPOINT', webSocketCallbackUrl);
    createAIGameFn.addEnvironment('CONNECTIONS_TABLE_NAME', webSocketApi.connectionsTable.tableName);

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

    // Import existing Route53 Hosted Zone by ID (avoiding ambiguity with multiple zones)
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: 'Z08470612V1IPS7PSG7B5',
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

    // Deploy frontend to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ['/*']
    })

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'REST API Gateway URL (deprecated - use HTTP API)',
      exportName: 'JottoGameApiUrl'
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: httpApi.url!,
      description: 'HTTP API URL (40% cheaper than REST API)',
      exportName: 'JottoGameHttpApiUrl'
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB Table Name'
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 bucket for frontend hosting'
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Website URL (CloudFront)'
    });

    new cdk.CfnOutput(this, 'CustomDomainUrl', {
      value: 'https://jotto.maxsaltonstall.com',
      description: 'Custom Domain URL'
    });

    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: webSocketCallbackUrl,
      description: 'WebSocket API URL'
    });
  }
}
