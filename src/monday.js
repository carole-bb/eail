const fetch = require("node-fetch");

const MONDAY_API_URL = "https://api.monday.com/v2";

async function mondayQuery(query, variables = {}) {
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_KEY,
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function getBoardUsers(boardId) {
  const data = await mondayQuery(
    `query($boardId: ID!) {
      boards(ids: [$boardId]) {
        subscribers { id name email }
      }
    }`,
    { boardId }
  );
  return data.boards[0]?.subscribers ?? [];
}

async function getBoardGroups(boardId) {
  const data = await mondayQuery(
    `query($boardId: ID!) {
      boards(ids: [$boardId]) {
        groups { id title }
      }
    }`,
    { boardId }
  );
  return data.boards[0]?.groups ?? [];
}

async function createTask({ boardId, groupId, name, assigneeId, description }) {
  const columnValues = {};
  if (assigneeId) columnValues.person = { personsAndTeams: [{ id: Number(assigneeId), kind: "person" }] };
  if (description) columnValues.text = description;

  const data = await mondayQuery(
    `mutation($boardId: ID!, $groupId: String!, $name: String!, $cols: JSON!) {
      create_item(board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $cols) {
        id url
      }
    }`,
    {
      boardId,
      groupId,
      name,
      cols: JSON.stringify(columnValues),
    }
  );
  return data.create_item;
}

module.exports = { getBoardUsers, getBoardGroups, createTask };
