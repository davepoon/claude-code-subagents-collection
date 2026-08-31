---
name: apify-product-lookup
description: "Fetch a real product's current price, stock, rating, or images from retailer pages over the Apify MCP server, and return them as typed fields rather than prose. Use when someone asks what a product costs right now, whether it is in stock, how it is rated, to compare a product across retailers, or to check a product URL they pasted. Also use when an agent would otherwise answer a product question from training data. Not for managing your own store's catalog, not for payments, and not for questions answerable without live retailer data."
category: ecommerce
license: MIT
---

# Apify product lookup

A model answers product questions from training data that was fixed months ago, or by
reading a page as prose with no product fields. This skill routes the question to a hosted
Actor that reads retailer pages on request and returns structured records: price, currency,
stock, rating, image URLs, and a link.

Written by a product marketing manager at Apify. It calls
[E-commerce Scraping Tool](https://apify.com/apify/e-commerce-scraping-tool), a paid
first-party Apify Actor, so weigh the framing accordingly. Everything below is what
testing against the live Actor returned, including where it does not work.

## Setup

The MCP endpoint is `https://mcp.apify.com`. Appending
`?tools=apify/e-commerce-scraping-tool` narrows the server to this one Actor, which makes
tool selection more reliable when product data is the only job. Authentication is OAuth on
first use for interactive clients, or a bearer token for unattended ones. An Apify account
is required and the Actor is paid, billed per run started plus per product returned.

## Pick the input before calling

| The question | Input to send |
|---|---|
| About a specific page the user gave you | `detailsUrls: [{"url": "..."}]` |
| "Find me an X under $Y" with no URL | `keyword` plus `marketplaces` |
| "Compare X across stores" | `keyword` plus several `marketplaces` |

Always send `maxProductResults` and `additionalProperties: true`. Without the second,
stock, rating, list price and identifiers are all missing, because they are nested there
rather than at the top level.

## The call is two steps, sometimes three

1. Call `apify--e-commerce-scraping-tool` (two hyphens, not a slash). It returns run
   metadata and a `datasetId`. **It does not return products.**
2. **Check `status`.** If it is not `SUCCEEDED`, call `get-actor-run` with the `runId` and
   a `waitSecs` until it is. The Actor tool returns when its own wait window elapses, not
   when the run finishes, so `RUNNING` is a normal answer and the dataset holds nothing at
   that moment.
3. Call `get-dataset-items` with the `datasetId`, a `limit`, and `fields`.

Two failures live here. Stopping after step 1 returns a result that reads like success and
holds no product data. Skipping step 2 fetches an empty dataset and reports the product as
not found, intermittently, depending only on how fast the retailer answered.

## Project with fields, and read them defensively

The full record is large: one Amazon product measured about 88 KB across 142 fields, most
of it marketing content and review text. Pass `fields` in dot notation, naming only what
the question needs.

**Projected output comes back flat.** The dots stay in the key names, so it is
`item["offers.price"]`, not `item["offers"]["price"]`. Walking the nested path against a
projected response finds nothing, which is indistinguishable from the retailer not
reporting the field.

The four differences that bite hardest:

- `offers.price` is a number on some retailers and a string on others.
- Currency is `offers.priceCurrency` on some and `offers.currency` on others, and the value
  may be a symbol or an ISO code.
- Stock and rating live under `additionalProperties`, as `inStock` and `stars`, not at the
  top level. Top-level `rating` was `null` on a product whose `stars` was 4.2.
- `brand` frequently carries marketing text such as `Visit the Sony Store` rather than a
  brand name.

## Answer honestly

- **Say when the data was read.** The point of the call is that the answer is current, so
  make that visible.
- **Never claim a product is unavailable because stock was absent.** Many retailers do not
  report it. Absent means unknown.
- **If every field comes back empty, suspect the URL before the retailer.** An
  unresolvable URL returns an item with no fields rather than an error.
- **Quote the source URL** so the user can check it.

## Scope and limits

- **Latency is high and unstable.** Measured end to end over MCP across twenty questions:
  14.7s fastest, 24.1s median, 95.8s slowest. Treat a runtime call as verification before
  the user acts, not as something to put inside every turn.
- **The `marketplaces` enum arrives truncated over MCP**, because the server caps how many
  characters of a long enum it forwards. Measured on 2026-08-27: of 249 values, 122 fit and
  127 were dropped. A validation error naming `marketplaces` means the retailer cannot be
  named in a keyword search on this connection, not that it is unsupported. Use
  `detailsUrls`, which takes arbitrary URLs and is unaffected.
- **Field coverage is a property of the retailer, not the tool.** On one measured run,
  Amazon returned 44 keys under `additionalProperties` and two other retailers returned 4,
  with stock and rating absent on every record from one of them. There is no unified schema
  to rely on.
- **Cost.** Cap with `maxProductResults`. Prefer one call with several URLs or marketplaces
  over several calls, and never re-run to check a result you already have.
- **`additionalProperties` can reach roughly 100 KB for one product.** Never paste it into
  a reply.
- A `rating` or `stars` of 0 means absent, not a zero-star product.
