# Sulis Vuorovahti

A Discord bot that monitors and notifies about available badminton court slots at Tali Tennis Center and Talihalli in Helsinki.

## Features

- Monitors available badminton court slots from two locations
- Updates a visual timetable in Discord every hour between 6:00-23:59
- Sends notifications for rare slots during peak hours on weekdays
- Deployed as AWS Lambda function using CDK

## Prerequisites

- Node.js (v20.x recommended)
- Docker (required for Lambda function bundling)
- AWS CLI configured with appropriate credentials
- Discord bot token and channel setup

## Project Structure

- `/src` - Main application code
- `/infra` - AWS CDK infrastructure code


## Discord Setup

1. Create a Discord bot and get the token from Discord Developer Portal
2. Create a server for the bot and invite it to the server
3. Create two text channels in your Discord server that normal users should not have write access to:
   - One for the timetable display
   - One for notifications

## Setup

1. Clone the repository

2. Install dependencies in both root and infra directories:

```bash
npm install
cd infra
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
EMAIL=your-tali-login-email
PASSWORD=your-tali-login-password
DISCORD_TOKEN=your-discord-bot-token
TABLE_CHANNEL_ID=your-table-channel-id
NOTIFICATION_CHANNEL_ID=your-notification-channel-id
```

4. Configure AWS credentials for deployment:

```bash
aws configure --profile personal
```

5. Deploy to AWS:

```bash
cd infra
npm run bootstrap # Only needed for first time setup
npm run deploy
```

## Local Development

To run the bot locally:

```bash
npm run start
```

## Infrastructure

The project uses AWS CDK to define and deploy infrastructure. The main components are:

- Lambda function running on Node.js 20.x runtime
- EventBridge rule for scheduling hourly runs

