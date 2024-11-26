import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { EMAIL, PASSWORD, DISCORD_TOKEN, TABLE_CHANNEL_ID, NOTIFICATION_CHANNEL_ID } from './config';

export class SulisVuoroVahtiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Lambda function
    const botFunction = new nodejs.NodejsFunction(this, 'BotFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'main',
      entry: path.join(__dirname, '../../src/main.ts'),
      depsLockFilePath: path.join(__dirname, '../../package-lock.json'),
      bundling: {
        // Need to use docker for bundling since canvas-dependency installation differs depending on the machine that does the installation
        // The docker image is supposed to mimic the machine where the code is deployed
        forceDockerBundling: true,
        nodeModules: ['canvas', '@sparticuz/chromium'],
      },
      environment: {
        EMAIL,
        PASSWORD,
        DISCORD_TOKEN,
        TABLE_CHANNEL_ID,
        NOTIFICATION_CHANNEL_ID,
      },
      timeout: cdk.Duration.minutes(3),
      memorySize: 1024,
    });

    // Create EventBridge rule to trigger the function every 30 minutes between 8:00-21:59 (UTC+2)
    const rule = new events.Rule(this, 'BotScheduleRule', {
      schedule: events.Schedule.cron({
        minute: '0,30',
        hour: '6-20',
        day: '*',
        month: '*',
        year: '*'
      }),
    });

    // Add the Lambda function as a target of the rule
    rule.addTarget(new targets.LambdaFunction(botFunction));
  }
}