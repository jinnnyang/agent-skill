# Implementation Plan: `read-rss` Skill

This plan details the process for implementing the `read-rss` skill using TypeScript, adhering to the project's Agent Skills specification and continuous guidance mechanism. We will avoid third-party libraries and rely solely on native APIs.

## Goal

Create a native TypeScript skill inside `skills/read-rss` to track and read RSS/Atom feeds. The tool will manage its state entirely via local JSON files and Markdown files without requiring an external database, allowing agents to easily interact with and ingest recent news/articles.

## Proposed Changes

### Native Implementation Approach
- Rely entirely on native Node.js and standard JavaScript APIs (e.g. native `fetch` for HTTP requests, `util.parseArgs` for argument parsing, and custom Regular Expressions for XML/HTML parsing to Markdown).
- **No Third-Party Dependencies:** `rss-parser`, `fast-xml-parser`, `turndown`, etc., will NOT be used to keep the skill lightweight and independent.

---

### `skills/read-rss`

#### [NEW] [SKILL.md](file:///c:/Users/jinnn/Desktop/agent-skill/skills/read-rss/SKILL.md)
Contains the YAML frontmatter trigger instructions.
Defines workflow logic for selecting and iterating over feeds, output requirements (e.g., date formatting and attributions), and caching guidelines for the agent.

#### [NEW] [rss.ts](file:///c:/Users/jinnn/Desktop/agent-skill/skills/read-rss/scripts/rss.ts)
The core CLI application powered by Node 20's `util.parseArgs` and native `fetch`.
- **Data Layer Interfaces**: 
  - `Feed`: `{ id: string, name: string, url: string, description: string }`
  - `Article`: `{ id: string, feedId: string, title: string, url: string, isRead: boolean, publishedDate: number, description: string, keywords: string[], tags: string[] }`
- **Commands Implementation**:
  - `feeds add/list/import/export/remove/config`: Manipulates `skills/read-rss/assets/feeds.json`. `import` and `export` manually parse/generate XML (OPML) strings using Regex arrays.
  - `read`: Uses native `fetch` and a robust two-stage regex design to parse both RSS and Atom 1.0 feeds, mapping new posts to `Article` entities, and appending them to `skills/read-rss/assets/items.json`. 
    - **Robust Parsing (Two-stage Regex strategy)**: 
      - **Stage 1 (Item extraction)**: Identifies and extracts `<item>...</item>` blocks (for RSS) or `<entry>...</entry>` blocks (for Atom) to isolate individual records.
      - **Stage 2 (Field extraction)**: Parses inner contents. It intelligently handles `<title><!\[CDATA\[(.*?)\]\]><\/title>` vs plain `<title>(.*?)<\/title>`, extracts `pubDate` or Atom `published`/`updated` fields, maps `<tag>` and `<keyword>` to string arrays, and captures `<description>`, `<content:encoded>`, or `<content>` gracefully.
  - `articles list/unread`: Manipulates the `items.json` file to query/update toggles and filtering.
  - `articles search`: Local keyword phrase search mechanism querying the `items.json` cache (primarily matching against `description` and `title`), inspired by the `read-repo` implementation. Outputs formatted results.
  - `articles read`: Employs a **lazy-loading caching mechanism**. Checks if `skills/read-rss/assets/articles/<title-feedId-publishedDate>.md` exists locally. If not, it natively `fetch`es the article URL, strips out scripts/styles, and transforms HTML into Markdown using native RegEx. Saves the `.md` file, marks `isRead=true`, and dumps output. Prints explicit error formats on HTTP failure for agent ingestion.
- **Archiving Logic**: Enforces a maximum limit of **2048 articles** in the active `items.json` array. Whenever this limit is reached (i.e. during a `read` update), the oldest **1024** entries are naturally extracted and archived into `skills/read-rss/assets/archive/<timestamp>.json`, keeping `items.json` lean and performant.
- **Continuous Guidance Mechanism**: Output `[AGENT GUIDANCE] ...` dynamically at the end of the script to hook workflow steps.

#### [NEW] Assets Structure
Will be automatically generated upon first run:
- `skills/read-rss/assets/feeds.json`: Feed configuration map.
- `skills/read-rss/assets/items.json`: Articles tracking map.
- `skills/read-rss/assets/articles/`: Folder storing lazy-loaded Markdown documents.
- `skills/read-rss/assets/archive/`: Folder storing overflow/archived articles (JSON batches).

## User Review Required

> [!NOTE]
> Please verify this robust implementation plan incorporating Atom 1.0 support, the 2048-item archiving limit, and two-stage robust CDATA/Regex parsing.

## Verification Plan

### Automated Tests
- Import OPML files: `pnpm exec tsx skills/read-rss/scripts/rss.ts feeds import --filename <local_opml>`
- Run `read` against simulated RSS 2.0 and Atom 1.0 XML feeds to verify cross-compatibility and verify that C-DATA text, metadata `keywords`, and `tags` are parsed precisely.
- Run caching and search capabilities on massive datasets, confirming that passing 2048 articles triggers an archival creation event writing older 1024 instances to `assets/archive/*.json`.
- Article fetch test: `pnpm exec tsx skills/read-rss/scripts/rss.ts articles read --id <id>`, verify lazy loading from fetch & raw HTML translation.
