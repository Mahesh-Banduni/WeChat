import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import fetch from 'node-fetch';

dotenv.config();

const BACKEND_API_BASE = `${process.env.HOSTNAME}/api`;
const SERVER_NAME = "backend-api-mcp";
const SERVER_VERSION = "1.0.0";

// Simple fetch wrapper
async function callApi(endpoint, options = {}) {
  const url = `${BACKEND_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${text}`);
  }

  return JSON.parse(text); // OK: inside function
}


// --------------------- MCP Server ---------------------
const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
  capabilities: { resources: {}, tools: {} },
});

// --------------------- Tools ---------------------

server.tool(
  "getUserConnections",
  "Fetches all connections for a given user.",
  {
    userId: z.string().describe("The ID of the user whose connections should be retrieved.")
  },
  async ({ userId }) => {
    const data = await callApi(`/analytics/connections/${userId}`);
    console.log("Data",data);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "getMostChattedUser",
  "Finds the user the given user has chatted with the most.",
  {
    userId: z.string().describe("The ID of the user for whom the most-chatted connection is determined.")
  },
  async ({ userId }) => {
    const data = await callApi(`/analytics/chats/${userId}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "listTools",
  "Lists all tools currently present.",
  { type: "object", properties: {} }, // explicit schema
  async () => {
      const toolList = Object.entries(server._registeredTools).map(
    ([name, tool]) => ({
      name,
      description: tool.description || "",
    })
  );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(toolList, null, 2),
        },
      ],
    };
  }
);

// --------------------- Start Transport ---------------------
const transport = new StdioServerTransport();
await server.connect(transport);

console.log(`✅ ${SERVER_NAME} v${SERVER_VERSION} connected successfully!`);
console.log("Registered tools:");

Object.entries(server._registeredTools).forEach(([name, tool]) => {
  console.log(`- ${name}: ${tool.description || ""}`);
});

