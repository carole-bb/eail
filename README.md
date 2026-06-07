# Slack → Monday Task Agent

An always-on Node.js agent that listens for Slack @mentions or `/monday-task` slash commands and automatically creates tasks in Monday.com using Claude AI to interpret the message and assign it to the right person.

## How it works

1. A user @mentions the bot or runs `/monday-task <description>` in Slack.
2. The bot sends the message text + board context (groups, members) to Claude.
3. Claude picks the best group and assignee and writes a task name.
4. The task is created in Monday.com and a link is posted back in the Slack thread.

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App → From scratch**.
2. Under **Socket Mode**, enable it and generate an **App-Level Token** (`xapp-…`) with scope `connections:write`.
3. Under **OAuth & Permissions**, add bot scopes:
   - `app_mentions:read`, `chat:write`, `users:read`, `commands`
4. Under **Event Subscriptions → Subscribe to bot events**, add `app_mention`.
5. Under **Slash Commands**, create `/monday-task`.
6. Install the app to your workspace.

### 2. Monday.com API key

- Go to your Monday profile → **Developers → My Access Tokens** → copy your personal API token.
- Find your board ID from the board URL: `https://yourorg.monday.com/boards/<BOARD_ID>`.

### 3. Configure environment

```bash
cp .env.example .env
# Fill in all values in .env
```

### 4. Run

```bash
npm install
npm start
```

## Environment variables

| Variable | Description |
|---|---|
| `SLACK_BOT_TOKEN` | Bot OAuth token (`xoxb-…`) |
| `SLACK_APP_TOKEN` | App-level token for Socket Mode (`xapp-…`) |
| `SLACK_SIGNING_SECRET` | From Basic Information in Slack app settings |
| `ANTHROPIC_API_KEY` | Claude API key |
| `MONDAY_API_KEY` | Monday.com personal API token |
| `MONDAY_BOARD_ID` | Numeric ID of the target Monday board |

## Usage

**@mention:**
```
@TaskBot Please have Alice review the login page design
```

**Slash command:**
```
/monday-task Fix the checkout bug — assign to Bob
```

The bot replies in thread with a link to the created Monday item.
