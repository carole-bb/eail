const Anthropic = require("@anthropic-ai/sdk");
const { getBoardUsers, getBoardGroups } = require("./monday");

const anthropic = new Anthropic.default();

/**
 * Given a Slack message and board context, returns:
 *   { taskName, groupId, assigneeId, description }
 */
async function interpretMessage({ text, senderName, boardId }) {
  const [users, groups] = await Promise.all([
    getBoardUsers(boardId),
    getBoardGroups(boardId),
  ]);

  const systemPrompt = `You are a task-routing assistant.
Your job is to extract a task from a Slack message and decide:
1. A short, clear task name (required).
2. Which board group best fits the task (choose from the list below).
3. Which team member should be assigned (choose from the list below, or null if unclear).
4. A short description that includes context (optional).

Respond ONLY with valid JSON matching this schema:
{
  "taskName": string,
  "groupId": string,       // must be one of the group IDs provided
  "assigneeId": string | null,  // must be one of the user IDs provided, or null
  "description": string    // brief context; can include who sent the message
}

Available groups:
${groups.map((g) => `- id="${g.id}" title="${g.title}"`).join("\n")}

Available users:
${users.map((u) => `- id="${u.id}" name="${u.name}" email="${u.email}"`).join("\n")}`;

  const userPrompt = `Slack message from ${senderName}:\n"${text}"`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = message.content[0].text.trim();
  // Strip markdown code fences if present
  const json = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(json);
}

module.exports = { interpretMessage };
