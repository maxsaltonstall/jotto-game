#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { JottoGameStack } from '../lib/jottogame-stack';

const app = new cdk.App();

new JottoGameStack(app, 'JottoGameStackV2', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1'
  },
  description: 'Jotto word guessing game infrastructure'
});

app.synth();
