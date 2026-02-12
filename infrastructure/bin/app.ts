#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import { JottoGameStack } from '../lib/jottogame-stack';

const app = new cdk.App();

const stack = new JottoGameStack(app, 'JottoGameStackV2', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1'
  },
  description: 'Jotto word guessing game infrastructure'
});

// Add tags to all resources in the stack
Tags.of(stack).add('project', 'jotto-game');
Tags.of(stack).add('environment', 'dev');
Tags.of(stack).add('owner', 'advocacy');
Tags.of(stack).add('primary-contact', 'salt@datadoghq.com');

app.synth();
