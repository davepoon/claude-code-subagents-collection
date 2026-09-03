---
name: immich-photo-manager
category: storage-docs
description: "Manage your self-hosted Immich photo library through conversation: natural language and OCR search, geographic album curation, duplicate detection, people and faces, metadata repair, video frames and PDF photobooks. 94 MCP tools and 13 skills, tested live on Immich 2.x and 3.x. Install: claude plugin install immich-photo-manager"
---

# Immich Photo Manager

> MCP server and Claude Code plugin for intelligent photo management with self-hosted [Immich](https://immich.app).

## Overview

When your Immich library has grown past what you can manage by hand, this plugin gives Claude direct access to your instance through 94 MCP tools and 13 skills. Search with natural language or by the text inside a photo, create geographic albums from GPS data, find duplicates across import sources, manage people and faces, repair metadata, cut frames out of videos, export an album as a PDF photobook, and browse results in interactive HTML galleries. The plugin runs on your machine and talks only to your Immich; originals never leave your server.

## Key Features

- **Natural language search**: CLIP visual search ("sunset at the beach", "birthday cake"), plus people, places, dates and camera filters
- **Text inside photos**: OCR search finds a ticket, a sign or a document by what is written on it
- **Geographic albums**: albums organized by place from GPS clustering and temporal matching
- **Duplicate detection**: cross-source analysis with perceptual hashing (catches re-encoded copies from Apple Photos and Google Takeout); near-duplicates can be stacked instead of deleted
- **People and faces**: list, search, merge and rename people, reassign misidentified faces
- **Metadata repair**: fix noon and midnight timestamps, infer missing GPS from neighboring photos, correct timezone offsets
- **Video frames and PDF reports**: evenly spaced frames from any clip, and an album or selection exported as a PDF photobook with captions, built locally
- **Dates in one call**: month buckets, a calendar heatmap that shows gaps, and Immich's "on this day" memories
- **Library health**: asset inventory, metadata quality, storage breakdown and recommendations
- **Notes between sessions**: verdicts stored on each asset, so the next cleanup skips what an earlier pass reviewed
- **Interactive galleries**: self-contained HTML files with embedded thumbnails, 3 themes, 4 view modes, slideshow
- **Safety first**: findings are shown and confirmed before anything is written; trash first, permanent delete only on request

## Compatibility

Every release runs live against real Immich 2.7.5 and 3.1.0 in Docker before it is tagged (all tools over MCP, state re-read after each write); the kit is in the repository under `tests/live/`. Works with Claude Code, Claude Desktop, LM Studio and any MCP client. Requires Immich 1.90+, an API key and Python 3.10+.

## Installation

```bash
git clone https://github.com/drolosoft/immich-photo-manager.git
cd immich-photo-manager
pip3 install -r src/requirements.txt
claude plugin marketplace add ./
claude plugin install immich-photo-manager
```

Then run `/setup-immich-photo-manager` inside Claude Code, or say "Update my Immich credentials to https://photos.example.com with API key <key>". The same server is available as `uvx immich-photo-manager` for other MCP clients and as a Docker image (`ghcr.io/drolosoft/immich-photo-manager`, MCP over HTTP on port 8626).

## Usage

```
"How healthy is my photo library?"
"Show me my photos from Italy"
"Find the photo with the train ticket"
"Create albums for everywhere I've traveled"
"Find duplicates in my library and keep the best of each group"
"Make me a PDF of the Sintra album"
/cleanup: scan for screenshots and junk
/my-travels: discover all travel destinations
```

## Skills

photo-search, photo-cleanup, duplicate-report, auto-album-curator, album-manager, album-report, travel-map, metadata-fixer, storage-optimizer, library-health-report, people-report, rotate-photos, timeline-gaps.

## Links

- **Repository**: https://github.com/drolosoft/immich-photo-manager
- **Tools reference**: https://github.com/drolosoft/immich-photo-manager/blob/main/doc/MCP-TOOLS.md
- **Demos from real sessions**: https://github.com/drolosoft/immich-photo-manager/blob/main/doc/demos/README.md
- **Author**: [Drolosoft](https://drolosoft.com)
- **License**: MIT
