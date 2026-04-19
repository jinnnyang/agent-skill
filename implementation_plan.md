# Implementation Plan: `read-rss` Skill (Finalized Design)

This plan details the process for implementing the `read-rss` skill using TypeScript, adhering to the project's Agent Skills specification and continuous guidance mechanism. We will avoid third-party libraries and rely solely on native APIs.

## Goal

Create a native TypeScript skill inside `skills/read-rss` to track and read RSS/Atom feeds. The tool will manage its state entirely via local JSON files and Markdown files without requiring an external database, allowing agents to easily interact with and ingest recent news/articles.

## Proposed Changes

### Native Implementation Approach
- Rely entirely on native Node.js and standard JavaScript APIs (e.g., native `fetch` for HTTP requests, `util.parseArgs` for argument parsing).
- **No Third-Party Dependencies**: No `rss-parser`, `fast-xml-parser`, or `turndown`. Parsing will be handled via structured Regex and string manipulation.

---

### `read-rss` Skill Components

#### [NEW] [SKILL.md](file:///c:/Users/jinnn/Desktop/agent-skill/skills/read-rss/SKILL.md)
- Contains YAML frontmatter for skill registration.
- Defines workflow instructions for the Agent (scanning, reading, summarizing).

#### [NEW] [rss.ts](file:///c:/Users/jinnn/Desktop/agent-skill/skills/read-rss/scripts/rss.ts)
Core CLI powered by `util.parseArgs`. Supports:
- `feeds add/list/remove`: Manage `feeds.json`.
- `read`: Fetch and parse RSS (2.0) and Atom (1.0) feeds.
- `articles list/unread`: Filter items in `items.json`.
- `articles search`: Keyword search against cached items.
- `articles read`: Fetch HTML, strip `<script>`/`<style>`, convert core tags (`<p>`, `<h1>`-`<h6>`, `<li>`) to Markdown, and save to `assets/articles/`.

#### [NEW] [utils.ts](file:///c:/Users/jinnn/Desktop/agent-skill/skills/read-rss/scripts/utils.ts)
- **Robust XML Parsing**: Two-stage extraction (Block identification -> Field extraction) to handle variations without a full DOM.
- **Atom Support**: Maps `<entry>` nodes and their specific child tags (`<summary>`, `<content>`, `<link href="...">`) to the standard `Article` interface.
- **Sanitization**: Ensures filenames and URLs are safe for all filesystems.

### Data Layer & Scalability

#### Assets Structure
- `assets/feeds.json`: Feed URLs and metadata.
- `assets/items.json`: Active article cache.
- `assets/archive/`: Stored `.json` archives of old items.
- `assets/articles/`: Cached `.md` article contents.

#### Archiving Strategy
- **Max Capacity**: 2048 items in `items.json`.
- **Logic**: Upon reaching 2048 items, the oldest 1024 items are moved to `assets/archive/[timestamp]-archive.json` and removed from `items.json`.

---

## Continuous Guidance Mechanism
Output `[AGENT GUIDANCE] ...` at the end of execution to suggest next steps (e.g., "Found 12 new items. Use 'articles list --unread' to view them.").

## Verification Plan

### Automated Tests
- Test cases for RSS and Atom XML samples using the native parser.
- Verification of the archiving logic (triggering archive at 2048+ items).

### Manual Verification
- Fetching live RSS/Atom feeds.
- Checking filename sanitization on Windows.
