---
name: llm-crawler-access-check
description: "Check whether a website's robots.txt allows the AI crawlers that decide visibility in ChatGPT Search, Perplexity, Claude, Gemini, and Microsoft Copilot. Use when someone asks whether AI bots are blocked, whether to allow or block GPTBot, why a site never appears in AI answers, or wants a robots.txt review for AI crawlers. Reads only robots.txt, then returns a per-agent allow/block table, the exact rule responsible for each verdict, and the precise lines to change. Distinguishes training crawlers from the search crawlers that actually control citations."
category: security
license: MIT
---

# AI crawler access check

One wrong line in `robots.txt` removes a site from AI answers completely, and no
amount of content work can compensate. This check takes under a minute and
should run before any other AI-visibility work.

## Scope

Read `https://<domain>/robots.txt` and nothing else. Do not crawl the site, do
not attempt to access disallowed paths, and do not bypass any access control.
This is a read of one public file.

## Procedure

### 1. Fetch

Fetch `https://<domain>/robots.txt`.

- **404 or empty** - everything is allowed by default. Say so; that is a valid
  and often correct configuration. Stop and report.
- **Non-200 other than 404, or unreachable** - report the status code and stop.
  Do not guess at contents.
- **Served as HTML** (a soft 404 returning the site's error page) - flag it.
  Crawlers may parse it as garbage. This is itself a finding.

### 2. Resolve each agent

For each agent below, apply standard robots.txt matching: the most specific
`User-agent` group that names the agent wins, and `*` applies only when no group
names it. Within the winning group, the longest matching path rule wins, and
`Allow` beats `Disallow` on an equal-length match.

| Agent | Operator | Purpose | What blocking it actually costs |
| --- | --- | --- | --- |
| `OAI-SearchBot` | OpenAI | search index | citations in ChatGPT Search |
| `ChatGPT-User` | OpenAI | live fetch during a chat | the model cannot open your page when a user asks about it |
| `GPTBot` | OpenAI | training | background model knowledge, not search citations |
| `PerplexityBot` | Perplexity | search index | Perplexity citations |
| `Perplexity-User` | Perplexity | live fetch during a query | live page reads |
| `ClaudeBot` | Anthropic | index and training | Anthropic-side retrieval |
| `Googlebot` | Google | main index | **AI Overviews and AI Mode**, plus normal search |
| `Google-Extended` | Google | Gemini grounding and training | Gemini grounding only - **not** AI Overviews |
| `Bingbot` | Microsoft | Bing index | Microsoft Copilot, which rides the Bing index |
| `Applebot` | Apple | index | Apple search surfaces |
| `Applebot-Extended` | Apple | training | Apple Intelligence training only |
| `CCBot` | Common Crawl | open crawl corpus | an input to many downstream models |

Crawler names change and new ones appear. Before finalizing, check each
operator's own published crawler documentation for agents added or renamed since
this list was written, and include them. State which list you used.

### 3. Report

Produce a table with one row per agent and exactly these columns:

`Agent | Verdict (ALLOWED / BLOCKED / PARTIAL) | Rule responsible | Impact`

- **Rule responsible** must quote the literal line from `robots.txt`, or say
  `no matching rule - allowed by default`. Never state a verdict without the
  line that produced it.
- **PARTIAL** means important paths are disallowed while the site root is
  allowed. Name the disallowed paths.

Then give:

- **Verdict** - one sentence: is this site reachable by AI answer engines, or not?
- **What to change** - the exact `robots.txt` lines to add, remove, or edit,
  as a code block the user can paste. If nothing needs to change, say that
  plainly rather than inventing work.
- **What this check did not cover** - `robots.txt` is only the first gate.
  Server-side blocking by WAF, CDN bot rules, IP reputation, or Cloudflare bot
  management can block a crawler that `robots.txt` allows, and none of that is
  visible in this file. Say so every time.

## Three mistakes this check exists to catch

1. **Blocking `GPTBot` to opt out of training, and assuming that is the whole
   story.** It is not. `OAI-SearchBot` governs whether a site can be cited in
   ChatGPT Search, and it is a separate agent with a separate rule. Blocking one
   does not block the other, in either direction.
2. **Blocking `Google-Extended` to stay out of AI Overviews.** It does not do
   that. AI Overviews and AI Mode are built on the normal Googlebot index.
   Blocking `Google-Extended` opts out of Gemini grounding and training and has
   no effect on AI Overviews. To leave AI Overviews, the mechanism is the
   `nosnippet`, `max-snippet`, or `data-nosnippet` family, and it costs normal
   search snippets too. Say that tradeoff out loud rather than letting the user
   discover it later.
3. **A blanket `User-agent: * / Disallow: /` inherited from a staging config,
   a bot-mitigation template, or a security hardening guide.** This is common
   and almost always unintentional on a production marketing site.

## If the user asks whether they should block AI crawlers

Do not answer with a recommendation. Lay out the tradeoff and let them decide:
allowing search crawlers is what makes citation possible, allowing training
crawlers affects model knowledge but not citation, and the two decisions are
independent. Publishers with a licensing position and companies that want to be
recommended by AI assistants land in different places, and both are legitimate.

---

## About

Maintained by MaxAEO — <https://maxaeo.ai> — which works on AI answer-engine
visibility. The crawler matrix used here is kept current against each
operator's own published crawler documentation; where an agent has no official
documentation, this skill says so rather than guessing.

This check is free, read-only, and runs on one public file. It does not require
an account, an API key, or any paid service.
