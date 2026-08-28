---
name: bulkpublish-social-scheduling
description: "Schedule, publish and analyze social posts across 15 networks via BulkPublish (MCP or REST) — Facebook, Instagram, X, TikTok, YouTube, Threads, Bluesky, Pinterest, Google Business, LinkedIn, Mastodon, Discord, Telegram, Tumblr, Snapchat. Use when the user wants to post, schedule, or bulk-publish to social media, check connected channels, or read post analytics. Always check platform rules before composing."
category: social-media
license: MIT
---

# Social Publishing via BulkPublish

Cross-platform scheduling and publishing through one API. Unlike per-platform skills, this
targets many networks in a single call, with each platform's rules enforced up front.

## Setup

**MCP (recommended)** — hosted server, no install:

```bash
claude mcp add --transport http bulkpublish https://mcp.bulkpublish.com/mcp
```

Add it as a custom connector and OAuth 2.1 walks you through consent — no key in the URL.

**Or the npm server (stdio):**

```bash
claude mcp add bulkpublish --env BULKPUBLISH_API_KEY=bp_your_key -- npx -y @bulkpublish/mcp-server
```

**Or plain REST:** `https://app.bulkpublish.com/api`, spec at
`https://app.bulkpublish.com/openapi.json`, docs at `https://app.bulkpublish.com/docs`.

Get an API key at [app.bulkpublish.com/developer](https://app.bulkpublish.com/developer) and
send it as `Authorization: Bearer <key>`. API and MCP access are on every plan, free included.

## Workflow

1. `list_channels` — get connected accounts with their `channelId` and `platform`. Do this
   first; never guess a channel id.
2. Check the platform rules below (or `get_channel_options`) before composing.
3. Upload media if needed — `upload_media` takes a public `url` or a local `filePath`, and
   returns the id you pass in `mediaFileIds`.
4. `create_post` with `content`, `channels`, and `status: "scheduled"` plus `scheduledAt`
   (or leave it a draft, then `publish_post` when the user confirms).
5. Confirm the exact text, target accounts, and time with the user **before** publishing.

## create_post essentials

```
content            (string, required)      — post text
channels           (array,  required)      — [{ channelId: number, platform: string }]
status             ("draft" | "scheduled") — default "draft"
scheduledAt        (ISO 8601 string)       — required when status is "scheduled"
timezone           (string)                — e.g. "America/New_York"
mediaFileIds       (number[])              — ids from upload_media
platformContent    (object)                — per-platform text override
postTypeOverrides  (object)                — per-platform post type, e.g. {"instagram":"reel"}
platformSpecific   (object)                — per-platform extras (titles, link previews)
requestApproval    (boolean, false)        — hold the post for human review
```

`create_post` schedules or drafts. To send something out immediately, create it and then call
`publish_post`; `retry_post` re-runs a failed one.

## Platform rules that actually break posts

- **YouTube and TikTok require video.** Never include them on an image-only or text-only post.
- **YouTube and Pinterest require a title** — set `platformSpecific.youtube.title` /
  `platformSpecific.pinterest.title`.
- **Instagram defaults to `feed_photo`.** With a video you must set
  `postTypeOverrides.instagram` to `reel` or `feed_video`, or the post fails.
- **Instagram needs a Business or Creator account** — personal accounts are rejected.
- **Character limits differ sharply**: X 280, Bluesky 300, Threads / Mastodon / Google Business
  500, Pinterest 1,500, Discord 2,000, Instagram / TikTok 2,200, LinkedIn 3,000, Telegram 4,096,
  YouTube 5,000, Facebook 63,206. Use `platformContent` to give the short networks their own
  trimmed text rather than truncating everything down to the smallest limit.
- **Facebook cannot mix images and video** in one post.

## Approvals

Posts carry an `approvalStatus` (`none` | `pending` | `approved` | `rejected`) separate from
`status`. The scheduler never publishes a `pending` or `rejected` post. Pass
`requestApproval: true` to hold a post for a human; `approve_post` / `reject_post` release it.
API keys whose role lacks `post:publish` always have it forced on and get `403
APPROVAL_REQUIRED` from publish and retry — that is expected, not a bug.

## Analytics

`get_analytics` takes `startDate` / `endDate` (ISO dates) and returns a summary with a
per-platform breakdown; `get_post_metrics` covers a single post. Outbound `linkClicks` are
measured by BulkPublish's own short links and are reported separately from `clicks` — one
visit can appear in both, so never add them together.

## Other tools

`get_channel_health` (re-auth needed?), `get_queue_slot` (next optimal time for a timezone),
`create_schedule` (recurring posts), `list_labels`, `get_quota_usage` (plan limits and usage).

## Rules

- Read the docs or the OpenAPI spec rather than inventing endpoints or parameters.
- Confirm channel ids from `list_channels` before every publish.
- Show the user the exact text, accounts and time before anything goes out.
- If a platform cannot do what was asked, say so instead of silently dropping it.
