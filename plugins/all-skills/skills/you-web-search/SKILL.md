---
name: you-web-search
category: research
description: "Search the live web and read URLs through the You.com MCP server. Use when you need current information beyond training data: recent releases, docs, pricing, news, or any question where facts may have changed. Two endpoints: keyless basic search at https://api.you.com/mcp?profile=free, or full tools with an API key from https://you.com/platform/api-keys."
---

# You.com Web Search

Current web search and URL content extraction for Claude Code via the You.com MCP server.

## Setup

The MCP server is remote — no local install, just one config entry.

**Option A — keyless (basic search):**

```json
{
  "mcpServers": {
    "you": {
      "url": "https://api.you.com/mcp?profile=free"
    }
  }
}
```

**Option B — full tools (API key):**

```json
{
  "mcpServers": {
    "you": {
      "url": "https://api.you.com/mcp",
      "headers": {
        "Authorization": "Bearer ${YDC_API_KEY}"
      }
    }
  }
}
```

Get a key at [you.com/platform/api-keys](https://you.com/platform/api-keys) and set `YDC_API_KEY` in your environment.

## Tools

- `you-search` — web search with fresh results and source URLs (available on both endpoints)
- URL/content extraction and cited research tools (available with an API key)

## When to Use

- "What's the current stable version of Node.js?"
- "Find recent posts about the new React compiler and summarize the reception"
- "Check the latest docs for this API before writing the integration"

Any question where your training data might be stale, or where the user asks for sources.

## How to Use

1. Call `you-search` with a focused query.
2. Extract key facts from the results and cite the source URLs.
3. For deeper dives, fetch the page content of the most relevant results.

**User**: "What changed in the latest Python release?"

**Output**: summary of release notes with links to the official announcement.

## Tips

- Search narrowly — one question per query, then refine.
- Always include source URLs in your answer.
- If the server isn't configured, tell the user to add it with the JSON above (one entry, no install step).
