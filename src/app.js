require("dotenv").config();
const { App } = require("@slack/bolt");
const { interpretMessage } = require("./agent");
const { createTask } = require("./monday");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

const BOARD_ID = process.env.MONDAY_BOARD_ID;

// Handle @mentions
app.event("app_mention", async ({ event, client, say }) => {
  const text = event.text.replace(/<@[^>]+>/g, "").trim();
  if (!text) return say("Hi! Mention me with a task description to create it in Monday.");

  try {
    const userInfo = await client.users.info({ user: event.user });
    const senderName = userInfo.user.real_name || userInfo.user.name;

    await say({ text: `Got it, creating a Monday task for: _${text}_...`, thread_ts: event.ts });

    const parsed = await interpretMessage({ text, senderName, boardId: BOARD_ID });
    const slackLink = `https://slack.com/archives/${event.channel}/p${event.ts.replace(".", "")}`;
    const description = [parsed.description, `Slack: ${slackLink}`].filter(Boolean).join("\n");

    const item = await createTask({
      boardId: BOARD_ID,
      groupId: parsed.groupId,
      name: parsed.taskName,
      assigneeId: parsed.assigneeId,
      description,
    });

    await say({
      text: `Task created! <${item.url}|${parsed.taskName}>`,
      thread_ts: event.ts,
    });
  } catch (err) {
    console.error(err);
    await say({ text: `Sorry, something went wrong: ${err.message}`, thread_ts: event.ts });
  }
});

// Handle /monday-task slash command
app.command("/monday-task", async ({ command, ack, respond }) => {
  await ack();
  const text = command.text.trim();
  if (!text) {
    await respond("Please provide a task description. Example: `/monday-task Fix login bug for @alice`");
    return;
  }

  try {
    await respond({ text: `Creating task: _${text}_...`, response_type: "ephemeral" });

    const userInfo = await app.client.users.info({ user: command.user_id });
    const senderName = userInfo.user.real_name || userInfo.user.name;

    const parsed = await interpretMessage({ text, senderName, boardId: BOARD_ID });
    const description = [parsed.description].filter(Boolean).join("\n");

    const item = await createTask({
      boardId: BOARD_ID,
      groupId: parsed.groupId,
      name: parsed.taskName,
      assigneeId: parsed.assigneeId,
      description,
    });

    await respond({
      text: `Task created! <${item.url}|${parsed.taskName}>`,
      response_type: "ephemeral",
    });
  } catch (err) {
    console.error(err);
    await respond({ text: `Error: ${err.message}`, response_type: "ephemeral" });
  }
});

(async () => {
  await app.start();
  console.log("Monday task agent is running (Socket Mode)");
})();
