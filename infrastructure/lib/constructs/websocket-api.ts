/**
 * WebSocket API CDK Construct
 * Creates WebSocket API Gateway, ConnectionsTable, and Lambda handlers
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';

export interface WebSocketApiProps {
  /**
   * DynamoDB table for storing game data
   */
  gameTable: dynamodb.Table;

  /**
   * Lambda code asset
   */
  lambdaCode: lambda.Code;

  /**
   * Common Lambda props (with required fields)
   */
  lambdaProps: {
    runtime: lambda.Runtime;
    environment?: { [key: string]: string };
    timeout?: cdk.Duration;
    memorySize?: number;
    layers?: lambda.ILayerVersion[];
  };

  /**
   * Datadog API Key Secret
   */
  datadogApiKeySecret: secretsmanager.Secret;
}

export class WebSocketApi extends Construct {
  public readonly webSocketApi: apigatewayv2.WebSocketApi;
  public readonly connectionsTable: dynamodb.Table;
  public readonly webSocketUrl: string;

  constructor(scope: Construct, id: string, props: WebSocketApiProps) {
    super(scope, id);

    // DynamoDB Table for WebSocket connections
    this.connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: 'JottoGameConnectionsTable',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl'
    });

    // GSI for querying by connectionId
    this.connectionsTable.addGlobalSecondaryIndex({
      indexName: 'ConnectionIdIndex',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Lambda Functions for WebSocket routes
    // Note: No Datadog layers - WebSocket handlers use CloudWatch logging only
    const connectFn = new lambda.Function(this, 'ConnectFunction', {
      runtime: props.lambdaProps.runtime,
      timeout: props.lambdaProps.timeout,
      memorySize: props.lambdaProps.memorySize,
      layers: [], // No Datadog layers for WebSocket handlers
      code: props.lambdaCode,
      handler: 'dist/functions/ws-connect.handler',
      description: 'Handle WebSocket $connect route',
      environment: {
        ...props.lambdaProps.environment,
        CONNECTIONS_TABLE_NAME: this.connectionsTable.tableName
      }
    });

    const disconnectFn = new lambda.Function(this, 'DisconnectFunction', {
      runtime: props.lambdaProps.runtime,
      timeout: props.lambdaProps.timeout,
      memorySize: props.lambdaProps.memorySize,
      layers: [], // No Datadog layers for WebSocket handlers
      code: props.lambdaCode,
      handler: 'dist/functions/ws-disconnect.handler',
      description: 'Handle WebSocket $disconnect route',
      environment: {
        ...props.lambdaProps.environment,
        CONNECTIONS_TABLE_NAME: this.connectionsTable.tableName
      }
    });

    const messageFn = new lambda.Function(this, 'MessageFunction', {
      runtime: props.lambdaProps.runtime,
      timeout: props.lambdaProps.timeout,
      memorySize: props.lambdaProps.memorySize,
      layers: [], // No Datadog layers for WebSocket handlers
      code: props.lambdaCode,
      handler: 'dist/functions/ws-message.handler',
      description: 'Handle WebSocket $default route (messages)',
      environment: {
        ...props.lambdaProps.environment,
        CONNECTIONS_TABLE_NAME: this.connectionsTable.tableName
      }
    });

    // Grant DynamoDB permissions
    this.connectionsTable.grantReadWriteData(connectFn);
    this.connectionsTable.grantReadWriteData(disconnectFn);
    this.connectionsTable.grantReadData(messageFn);

    // Grant game table read access (for validation if needed)
    props.gameTable.grantReadData(connectFn);

    // Grant Secrets Manager permissions
    props.datadogApiKeySecret.grantRead(connectFn);
    props.datadogApiKeySecret.grantRead(disconnectFn);
    props.datadogApiKeySecret.grantRead(messageFn);

    // Create WebSocket API
    this.webSocketApi = new apigatewayv2.WebSocketApi(this, 'WebSocketApi', {
      apiName: 'JottoGameWebSocketApi',
      description: 'WebSocket API for real-time Jotto game updates',
      connectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('ConnectIntegration', connectFn)
      },
      disconnectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('DisconnectIntegration', disconnectFn)
      },
      defaultRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('MessageIntegration', messageFn)
      }
    });

    // Create stage
    const stage = new apigatewayv2.WebSocketStage(this, 'ProdStage', {
      webSocketApi: this.webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
      description: `WebSocket stage - deployed ${new Date().toISOString()}`
    });

    // Store WebSocket URL for frontend
    this.webSocketUrl = stage.url;

    // Grant all game Lambda functions permission to use API Gateway Management API
    // This allows them to send messages to WebSocket connections
    const managementApiPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'execute-api:ManageConnections',
        'execute-api:Invoke'
      ],
      resources: [
        `arn:aws:execute-api:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${this.webSocketApi.apiId}/*`
      ]
    });

    // We'll add this policy to game Lambda functions later in the stack
    this.webSocketApi.grantManageConnections = (grantable: iam.IGrantable) => {
      return iam.Grant.addToPrincipal({
        grantee: grantable,
        actions: ['execute-api:ManageConnections'],
        resourceArns: [
          `arn:aws:execute-api:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${this.webSocketApi.apiId}/*`
        ]
      });
    };

    // Set WEBSOCKET_API_ENDPOINT environment variable after the stage is created
    // This needs to be done after stage creation to get the callback URL
    const callbackUrl = `https://${this.webSocketApi.apiId}.execute-api.${cdk.Stack.of(this).region}.amazonaws.com/${stage.stageName}`;

    // Update message and connect functions with the callback URL
    messageFn.addEnvironment('WEBSOCKET_API_ENDPOINT', callbackUrl);
    connectFn.addEnvironment('WEBSOCKET_API_ENDPOINT', callbackUrl);

    // Grant connect function permission to post to connections
    connectFn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${this.webSocketApi.apiId}/*`
      ]
    }));

    // Output WebSocket URL
    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: this.webSocketUrl,
      description: 'WebSocket API URL',
      exportName: 'JottoGameWebSocketUrl'
    });

    new cdk.CfnOutput(this, 'WebSocketCallbackUrl', {
      value: callbackUrl,
      description: 'WebSocket API Callback URL for PostToConnection',
      exportName: 'JottoGameWebSocketCallbackUrl'
    });
  }
}
