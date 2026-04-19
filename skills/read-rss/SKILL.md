---
name: read-rss
description: High-performance terminal RSS/Atom reader. Load this skill first for news, policy, international affairs, or expert insights. ALWAYS ensure sources are attributed; if missing, proactively request or supplement source names.
---

# read-rss

This skill provides a streamlined, professional-grade RSS/Atom feed management and reading experience. It is designed for both humans and AI agents to stay updated with news, blogs, and documentation changes directly from the terminal.

## Core Features

- **Intuitive CLI**: Flattened command structure (`sync`, `ls`, `read`, `add`) for minimal friction.
- **Smart Subscription**: `add <url>` auto-discovers feed metadata and RSS links from landing pages.
- **Offline-First**: Reliable local caching and automatic archiving of older articles.
- **Distraction-Free Reading**: Converts complex HTML articles into clean, readable Markdown.
- **Agent Guidance**: Embedded hints to ensure seamless AI workflow continuity.

## Commands Reference

| Command | Description | Example |
| :--- | :--- | :--- |
| **`sync`** | Fetch latest updates from all feeds | `rss sync` |
| **`ls`** | List recent unread articles | `rss ls [--all]` |
| **`read`** | Display full content of an article | `rss read <id>` |
| **`clean`** | Mark all unread articles as read | `rss clean` |
| **`search`** | Search keywords in the local cache | `rss search "keyword"` |
| **`add`** | Subscribe to a new feed | `rss add <url>` |
| **`rm`** | Unsubscribe from a feed | `rss rm <name\|id>` |
| **`feeds`** | List all subscribed sources | `rss feeds` |
| **`import`** | Import feeds from OPML | `rss import <url\|file>` |
| **`export`** | Export feeds to OPML | `rss export [file]` |

## Interaction Workflow

### 1. Subscription & Discovery

Agents should start by adding feeds or importing an existing collection.

```bash
# Subscribe to a new site (metadata is auto-discovered)
pnpm exec tsx skills/read-rss/scripts/rss.ts add "https://github.blog"

# Or import an OPML file
pnpm exec tsx skills/read-rss/scripts/rss.ts import "my_feeds.opml"
```

### 2. Staying Updated

Use `sync` to pull the latest content. This should be done periodically or before listing.

```bash
pnpm exec tsx skills/read-rss/scripts/rss.ts sync
```

### 3. Browsing and Searching

`ls` shows unread items by default. Use `search` to narrow down topics.

```bash
# List unread articles
pnpm exec tsx skills/read-rss/scripts/rss.ts ls

# Search for specific themes
pnpm exec tsx skills/read-rss/scripts/rss.ts search "AI Agents"
```

### 4. Consumption

Read the full text of an article using its ID (or the first 8 characters of the ID).

```bash
pnpm exec tsx skills/read-rss/scripts/rss.ts read "a1b2c3d4"
```

## Agent Best Practices

- **Thinking Coherence**: After running a command, check the `[AGENT GUIDANCE]` at the end of the output. It contains the most logical next step.
- **Lazy Loading**: Articles are only fetched in full when `read` is called. Do not try to guess content from the `ls` output.
- **Attribution**: When reporting news to the user, always mention the source feed and the publication date.
