---
name: postwire
category: social-media
description: "Publish and schedule to TikTok, Instagram, YouTube, LinkedIn, X, Bluesky, Mastodon, Facebook, Threads, Reddit, Telegram and Discord through one PostWire API call — writing a separate, native version of the post for each network instead of sending identical text everywhere. Use when the user wants to publish or schedule one idea across several platforms, wants per-network captions, or wants to know why a post was rejected before it is sent."
license: MIT
requires:
  env: [POSTWIRE_API_KEY]
---

# PostWire

Publish one idea to many social networks, with a **different post written for each one**.

Accounts are connected once through OAuth in the PostWire dashboard, so there is no per-platform
developer app, review queue, or token refresh to maintain. One API key covers every network.

## When to Use This Skill

- The user wants the same idea published to several networks, but written properly for each
- The user wants a post scheduled for later, or a week of posts queued from one topic
- The user asks why a post failed, or whether a post *will* fail before sending it
- The user is publishing video to TikTok or YouTube from an automation

## What Makes This Different

Most multi-posting APIs take one string and send it to every platform. That reads badly and gets
suppressed: a LinkedIn post written like a tweet performs like neither. PostWire has a `/api/generate`
step that writes a caption per network — length, tone, hashtags and link handling — from a single
prompt, which you then pass to publish or schedule.

It also **refuses posts that are going to fail**, before they are queued rather than after the
platform rejects them:

| network | requires |
|---|---|
| TikTok, YouTube | a video (`video_url`) |
| Instagram | a photo or a video |
| everything else | text is enough |

## Prerequisites

- An account at [postwire.io](https://postwire.io) — free tier: 1 brand, 30 posts/month, no card
- Networks connected in the dashboard (one OAuth click each)
- `POSTWIRE_API_KEY` in the environment

**Auth is `Authorization: Bearer $POSTWIRE_API_KEY`.**

One gotcha worth knowing: the dashboard shows a *preview* key immediately after signup, before the
email is confirmed. That key cannot publish. If the API answers `"This is a preview key"`
(`code: "preview_key"`), confirm the email and take the key from **API & MCP** in the dashboard.

## How to Use

Base URL: `https://postwire.io/api`

### Check what is connected

```bash
curl https://postwire.io/api/me -H "Authorization: Bearer $POSTWIRE_API_KEY"
```

Returns the plan, the monthly usage, and `connections[]` — publish only to networks listed there,
otherwise the call fails with `code: "not_connected"` and the offending platforms.

### Write a native caption per network

```bash
curl -X POST https://postwire.io/api/generate \
  -H "Authorization: Bearer $POSTWIRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "We shipped streaming uploads: 1GB videos now go through in 11 seconds",
    "platforms": ["linkedin", "x", "bluesky"]
  }'
```

Returns `{ "drafts": { "linkedin": {...}, "x": {...}, "bluesky": {...} } }`. Pass that object
straight through as `per_platform` below.

### Publish now

```bash
curl -X POST https://postwire.io/api/post \
  -H "Authorization: Bearer $POSTWIRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["linkedin", "x"],
    "per_platform": { "linkedin": {"text": "..."}, "x": {"text": "..."} }
  }'
```

Without `per_platform`, a single `text` is used everywhere — simpler, but it is the behaviour this
tool exists to avoid.

The response is **per platform**, and one failure does not cancel the rest:

```json
{ "results": [ { "ok": true, "platform": "linkedin", "id": "..." },
               { "ok": false, "platform": "x", "error": "..." } ] }
```

### Schedule instead

```bash
curl -X POST https://postwire.io/api/schedule \
  -H "Authorization: Bearer $POSTWIRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "run_at": "2026-09-01T09:00:00Z",
    "platforms": ["linkedin", "instagram"],
    "photo_url": "https://example.com/image.jpg",
    "label": "Launch announcement"
  }'
```

`run_at` is ISO 8601. The schedule endpoint validates connections *and* the media rules up front, so
a post that cannot work is rejected now instead of failing quietly at 7am.

### Fill a week from one topic

```bash
curl -X POST https://postwire.io/api/week \
  -H "Authorization: Bearer $POSTWIRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "topic": "what we learned running a one-person SaaS", "platforms": ["linkedin", "x"], "days": 5 }'
```

Five angles on one topic, queued across five days. Text-only networks only — the video platforms
would reject every one of them, and the endpoint says so rather than queueing them to fail.

## Errors Worth Handling

| code | meaning | fix |
|---|---|---|
| `preview_key` | key from before email confirmation | confirm email, use the key in API & MCP |
| `email_unverified` | mailbox not confirmed yet | open the emailed link |
| `not_connected` | platform not connected; `platforms[]` lists which | connect it in the dashboard |
| `media_required` | TikTok/YouTube without video, Instagram without media | add `video_url` or `photo_url` |
| 429 | monthly plan limit or a burst guard | check `usage` in `/api/me` |

## Media Notes

- Media is passed by URL (`video_url`, `photo_url`); PostWire fetches and forwards the bytes.
- TikTok and YouTube videos are streamed in chunks, so they can be up to **1GB**. Other networks and
  hosts that do not send `Content-Length` are capped at 80MB, because the file has to be held in memory.
- `POST /api/media/upload-url` returns a signed URL to upload a file directly (max 50MB) if you do
  not have somewhere to host it.

## Also Available

PostWire ships an **MCP server**, so an agent can call these as tools rather than as HTTP requests,
and there are n8n templates for the same flows. Both are linked from the dashboard.
