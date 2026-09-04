---
slug: freelance-proposals-that-dont-lie
title: I built a Claude Code skill that refuses to lie in my freelance proposals
excerpt: It writes a confident proposal when I give it real background — and flatly refuses when I don't.
author:
  name: Eder Ribeiro
  handle: ederribeirosilva
  avatarHue: 190
target:
  name: proposal-drafter
  kind: skill
  href: /skill/proposal-drafter
category: Skills
platforms:
  - Claude Code
cover: green
coverAlt: A freelancer's laptop with a half-written proposal on screen
date: Sep 4, 2026
readTime: 4
featured: false
pinned: false
pullQuote: If the input doesn't have it, the output doesn't claim it.
---

I'm a backend engineer picking up freelance work on the side. The paperwork around freelancing — proposals, scope docs, invoices — is the part nobody enjoys, so I started asking Claude Code to draft it for me.

It worked, and that was the problem. It worked *too* well. Ask for a proposal with a thin brief and it will happily invent "5+ years of relevant experience" and a portfolio link that doesn't exist. Confident, well-written, and false. That's not a productivity win — it's a liability with my name on it.

So I wrote `proposal-drafter` with one rule baked in: if the input doesn't have it, the output doesn't claim it.

## The test that mattered

I didn't trust my own skill until I tried to break it. I gave it a real job posting and nothing else — no background, no past work, no portfolio:

> "Write me a proposal for this job: need a script that scrapes prices from 3 competitor sites daily and emails a summary."

It refused:

> "I can't draft your proposal yet — I'm missing the required inputs to do it without inventing credentials. Could you share: your real skills and experience, 1-3 real past projects, any real portfolio links? Once you share those, I'll draft a proposal tailored to this job. If you have no directly relevant past project, just say so — I'll omit the proof point rather than invent one."

That's the whole point of the skill in one interaction. Give it something real, and it writes a tight, client-specific proposal instead of a template. Give it nothing, and it stops and asks instead of guessing.

## What's here vs. what's not

`proposal-drafter` is free and open, listed above. It's one piece of a 5-skill freelance workflow I built with the same anti-fabrication rule end to end — proposal → scope-of-work → client update → invoice summary → project handoff. The other 4 are a small paid bundle ([Freelance Toolkit for Claude Code](https://ribster014.gumroad.com/l/voqthx)) if the whole workflow is useful to you. This one stands on its own either way.
