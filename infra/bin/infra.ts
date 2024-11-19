#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SulisVuoroVahtiStack } from '../lib/stack';

const app = new cdk.App();
new SulisVuoroVahtiStack(app, 'SulisVuoroVahtiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-central-1',
  },
});