# Walkthrough: `read-rss` Skill Implementation

I have successfully implemented and refined the `read-rss` skill, providing a high-performance, native TypeScript solution for managing and reading RSS/Atom feeds directly from the terminal.

## 🚀 Key Accomplishments

### 1. Robust Native RSS/Atom Parser
Implemented a two-stage regex-based parser in `rss.ts` that handles:
- **RSS 2.0 & Atom 1.0**: Reliable extraction from both standards.
- **Metadata Support**: Captures tags, keywords, and publication dates.
- **CDATA Handling**: Correctly strips `<![CDATA[...]]>` wrappers for clean text.

### 2. Intelligent & Intuitive CLI
Following a recent refactor, the CLI now uses a flattened, action-oriented design:
- **`sync`**: Fetch updates from all subscriptions.
- **`ls`**: Scan recent unread articles with a clean, tabular view.
- **`read <id>`**: Direct positional argument support for viewing full content.
- **`add <url>`**: Smart subscription with metadata auto-discovery.
- **`clean`**: Quickly mark all pending items as read.

### 3. Progressive Data Management
- **Smart Archiving**: Automatically archives old items to JSON files when the cache exceeds 2048 entries, ensuring consistent performance.
- **Lazy Loading**: Full-text content is only fetched and converted to Markdown upon explicit request.
- **HTML-to-MD Transformation**: A native engine that filters out noise (scripts, styles, large Base64 images) and converts common HTML structural tags into readable Markdown.

### 4. Agent-First Design
- **Short IDs**: Articles are identified by 8-character MD5 prefixes for easier interaction.
- **Continuous Guidance**: Every command outputs a `[AGENT GUIDANCE]` tag to suggest the next logical step in the research workflow.

## ✅ Verification Results

### Automated Test Runs
- **Feed Addition**: Verified auto-discovery logic against complex landing pages.
- **Parsing**: Confirmed accuracy against real-world WeChat MP and technical blog RSS feeds.
- **CLI Flow**: Verified the full workflow: `add` -> `sync` -> `ls` -> `read` -> `clean`.

## 🛠️ Usage Example

```bash
# Subscribe to a new blog
pnpm exec tsx skills/read-rss/scripts/rss.ts add "https://github.blog"

# Stay updated
pnpm exec tsx skills/read-rss/scripts/rss.ts sync

# Browse your inbox
pnpm exec tsx skills/read-rss/scripts/rss.ts ls

# Consume content
pnpm exec tsx skills/read-rss/scripts/rss.ts read <short-id>
```

> [!TIP]
> Use `rss search "keyword"` to quickly find relevant articles across your entire subscription history!
