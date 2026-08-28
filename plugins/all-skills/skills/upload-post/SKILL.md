---
name: upload-post
category: social-media
description: "Publish and schedule content to 15 social platforms through one Upload-Post API call: TikTok, Instagram, YouTube, LinkedIn, Facebook, X, Threads, Pinterest, Bluesky, Reddit, Discord, Telegram, Mastodon, WordPress, and Google Business Profile. Use when the user wants to post or schedule a video, photo carousel, text, or document across several platforms at once, check upload status, pull analytics, or run Instagram comment-to-DM funnels."
license: MIT
requires:
  env: [UPLOAD_POST_API_KEY]
---

# Upload-Post

Publish one piece of content to many social platforms in a single API call.

Accounts are connected once through OAuth in the Upload-Post dashboard, so there is no
per-platform developer app, review process, or token refresh to maintain. A single API key
covers every platform.

## When to Use This Skill

- The user wants the same video, carousel, or post published to several platforms at once
- The user wants a post scheduled for a future date, or added to a posting queue
- The user asks for per-post or per-platform analytics (views, likes, impressions)
- The user wants to check whether an upload finished, or retry the platforms that failed
- The user wants Instagram comment-to-DM automation (keyword triggers → private DMs)

## What This Skill Does

1. Authenticates with `Authorization: Apikey $UPLOAD_POST_API_KEY`
2. Posts video, photos, text, or documents to one or more platforms in one request
3. Optionally schedules the post instead of publishing immediately
4. Polls upload status and reports the per-platform result
5. Reads analytics and upload history

## Prerequisites

- An account at [upload-post.com](https://upload-post.com) (free tier: 10 uploads/month)
- Social accounts connected in the dashboard
- A **profile** name (e.g. `mybrand`) — this groups the connected accounts and is what the
  `user` parameter refers to. It is not a social handle.
- `UPLOAD_POST_API_KEY` in the environment

## How to Use

Base URL: `https://api.upload-post.com/api`

**Auth uses the `Apikey` scheme, not `Bearer`.** Sending `Bearer` returns a misleading
`401 Invalid or expired token` even when the key is valid.

### Publish a video to several platforms

```bash
curl -X POST "https://api.upload-post.com/api/upload" \
  -H "Authorization: Apikey $UPLOAD_POST_API_KEY" \
  -F "user=mybrand" \
  -F "platform[]=tiktok" \
  -F "platform[]=instagram" \
  -F "platform[]=youtube" \
  -F "video=@clip.mp4" \
  -F "title=How to build better habits" \
  -F "async_upload=true"
```

`platform[]` is repeated once per target. `title` is required for YouTube and Reddit and
optional everywhere else.

### Publish a photo carousel

```bash
curl -X POST "https://api.upload-post.com/api/upload_photos" \
  -H "Authorization: Apikey $UPLOAD_POST_API_KEY" \
  -F "user=mybrand" \
  -F "platform[]=instagram" \
  -F "photos[]=@slide1.jpg" \
  -F "photos[]=@slide2.jpg" \
  -F "title=Five lessons from year one"
```

### Schedule instead of publishing now

Add `scheduled_date` (ISO-8601) and optionally `timezone` (IANA):

```bash
-F "scheduled_date=2026-12-31T18:00:00Z" -F "timezone=Europe/Madrid"
```

### Per-platform captions

`title` is the fallback. Override per platform with `<platform>_title`:

```bash
-F "title=New video out now" \
-F "tiktok_title=new vid 🔥 #fyp" \
-F "linkedin_title=A short breakdown of what we learned shipping this."
```

### Check the result

Long uploads run in the background and return a `request_id`:

```bash
curl "https://api.upload-post.com/api/uploadposts/status?request_id=REQ_ID" \
  -H "Authorization: Apikey $UPLOAD_POST_API_KEY"
```

### Other endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload` | POST | Videos |
| `/upload_photos` | POST | Photos and carousels |
| `/upload_text` | POST | Text-only posts |
| `/upload_document` | POST | Documents (LinkedIn) |
| `/uploadposts/status?request_id=X` | GET | Async upload status |
| `/uploadposts/history` | GET | Upload history |
| `/uploadposts/schedule` | GET | List scheduled posts |
| `/uploadposts/schedule/<job_id>` | PATCH / DELETE | Edit or cancel a scheduled post |
| `/uploadposts/me` | GET | Validate the API key |
| `/analytics/<profile>` | GET | Analytics |
| `/uploadposts/facebook/pages` | GET | List Facebook pages |
| `/uploadposts/linkedin/pages` | GET | List LinkedIn pages |
| `/uploadposts/pinterest/boards` | GET | List Pinterest boards |

## Example

**User**: "Post this clip to TikTok, Reels and Shorts with the caption 'Day 1 of building in public'"

**Output**:

```
Publishing clip.mp4 to tiktok, instagram, youtube...
request_id: req_8f21c04a

Status: completed
  tiktok     ✅  https://tiktok.com/@mybrand/video/7412...
  instagram  ✅  https://instagram.com/reel/C8xY2...
  youtube    ✅  https://youtu.be/dQw4w9Wg...
```

## Error Handling

- **`401 Invalid or expired token` with a key you know is good** — you sent `Bearer`. Use
  `Authorization: Apikey <key>`.
- **A platform fails while others succeed** — the status response reports per-platform
  results. Retry only the failed ones by passing `retry_request_id` rather than re-uploading
  everything.
- **`reached_active_user_cap` on TikTok** — TikTok's daily cap for the app was hit. The
  upload falls back to the TikTok inbox as a draft; the video is waiting in the app, not live.
- **Upload takes longer than 59 seconds** — it switches to async automatically. Do not treat
  a timeout as a failure; poll `/uploadposts/status` with the `request_id`.
- **Missing title on YouTube or Reddit** — both reject the upload. Every other platform
  accepts an empty title.

## Tips

- Send an `Idempotency-Key` header when retrying a request that may have already been
  accepted — it returns the existing job instead of double-posting.
- For TikTok, `post_mode=MEDIA_UPLOAD` puts the video in the app's drafts instead of
  publishing directly, which tends to get better organic reach.
- Use `first_comment` to drop a link or hashtags into the first comment automatically.
- The full parameter reference lives at [docs.upload-post.com](https://docs.upload-post.com),
  with an LLM-friendly dump at `https://docs.upload-post.com/llm.txt`.

## Resources

- API documentation: https://docs.upload-post.com
- Dashboard: https://upload-post.com
- Official skills repo: https://github.com/Upload-Post/upload-post-skills
- MCP connector: https://mcp.upload-post.com/mcp
