---
name: read-rss
description: Fetches and displays content from RSS and Atom feeds. Manages a local cache of feeds and articles, supports OPML import/export, and provides search functionality.
---

# read-rss

This skill allows you to manage and read content from RSS 2.0 and Atom 1.0 feeds. It maintains a local registry of your favorite feeds and a persistent cache of articles, allowing you to stay updated with news and blogs directly from the terminal.

## Core Features

- **Feed Management**: Add, remove, list, and configure RSS/Atom feeds.
- **OPML Support**: Import and export your feed lists via the standard OPML format.
- **News Ingestion**: Fetch latest articles from your subscribed feeds with a robust native parser.
- **Persistent Caching**: Tracks read/unread status and provides a fast local search.
- **Full-Text Capability**: Fetch and convert article web pages into Markdown for distraction-free reading.
- **Automatic Archiving**: Keeps performance high by archiving older items once the cache exceeds 2048 entries.

## When to use

- When you want to check for latest updates from a list of blogs or news sites.
- When you need to read the full content of an article without opening a browser.
- When you want to search through your recently fetched news items.
- When you need to manage a set of RSS subscriptions.

## Interaction Workflow

### 1. Managing Feeds

First, you need to add some feeds or import them from an OPML file.

```bash
# Add a new feed
pnpm exec tsx skills/read-rss/scripts/rss.ts feeds add --name "Example Blog" --url "https://example.com/rss" --description "A blog about examples"

# Import from OPML
pnpm exec tsx skills/read-rss/scripts/rss.ts feeds import --url "https://site.com/my-feeds.opml"
```

### 2. Fetching Latest Content

Pull the latest articles from all or specific feeds.

```bash
# Update all feeds
pnpm exec tsx skills/read-rss/scripts/rss.ts read

# Update a specific feed
pnpm exec tsx skills/read-rss/scripts/rss.ts read --name "Example Blog"
```

### 3. Listing and Searching Articles

View what's new or search for specific topics.

```bash
# List unread articles from the last 7 days
pnpm exec tsx skills/read-rss/scripts/rss.ts articles list

# Search categories or descriptions
pnpm exec tsx skills/read-rss/scripts/rss.ts articles search --query "Asset Allocation"
```

### 4. Reading Full Text

Download and read the full content of an article.

```bash
# Read an article by ID
pnpm exec tsx skills/read-rss/scripts/rss.ts articles read --id "article-uuid"
```

## Important Requirements

- **Attribution**: When summarizing articles, ALWAYS attribute the source and publication date (e.g., "Source, 2024-10-31").
- **Lazy Loading**: The script only downloads the full article text when `articles read` is explicitly called.
- **Guidance**: Look at the `[AGENT GUIDANCE]` section at the end of the script output for recommended next steps.
