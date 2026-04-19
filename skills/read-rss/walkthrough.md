# Walkthrough: `read-rss` Skill Implementation

I have successfully implemented the `read-rss` skill, providing a native TypeScript solution for managing and reading RSS/Atom feeds without external dependencies.

## Key Accomplishments

### 1. Robust Native RSS/Atom Parser
Implemented a two-stage regex-based parser in `rss.ts` that handles:
- **RSS 2.0**: Accurate extraction of items, `pubDate`, `content:encoded`, and `description`.
- **Atom 1.0**: Mapping of `<entry>`, `<published>`, and `<link href="...">` attributes to a unified schema.
- **Metadata Support**: Captures `<tag>` and `<keyword>` elements directly from the XML payload into tags/keywords arrays.
- **CDATA Handling**: Correctly strips `<![CDATA[...]]>` wrappers to ensure clean text output.

### 2. Intelligent CLI Interface
Built a feature-rich CLI using Node.js 20's `util.parseArgs`:
- **`feeds`**: Command family for adding, listing, removing, and configuring feeds, including OPML import via native regex.
- **`read`**: High-performance fetcher that updates all subscriptions and populates a central `items.json` cache.
- **`articles`**: Advanced search and listing tools. Supports searching by keyword across titles, descriptions, and categories.

### 3. Progressive Data Management
- **Archiving Logic**: Implemented a 2048-item limit for `items.json`. Once exceeded, the oldest 1024 items are automatically moved to individual timestamped JSON files in `assets/archive/`.
- **Lazy Loading**: Full-text article content is only fetched and converted to Markdown when the user explicitly requests to read a specific article.
- **HTML-to-MD Conversion**: A native regex-based transformation engine that strips noise (scripts, styles) and converts common HTML tags (`p`, `h1-h6`, `li`, `a`, `br`) into standard Markdown.

## Verification Results

### Automated Test Runs
- **Feed Addition**: Successfully added and tracked high-frequency feeds.
- **Ingestion**: Verified parsing against real-world WeChat MP RSS feeds.
- **Search**: Confirmed multi-field keyword searching functionality.
- **Persistence**: Verified successful generation of `feeds.json`, `items.json`, and cached `.md` articles.

## Usage Example

```bash
# Update news
pnpm exec tsx skills/read-rss/scripts/rss.ts read

# Search for specific news
pnpm exec tsx skills/read-rss/scripts/rss.ts articles search --query "Asset Allocation"

# Read unread content
pnpm exec tsx skills/read-rss/scripts/rss.ts articles read --id <id>
```

> [!TIP]
> Always check the `[AGENT GUIDANCE]` at the end of each command output for logical next steps in your news-reading workflow.
