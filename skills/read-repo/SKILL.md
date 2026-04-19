---
name: read-repo
description: Analyzes GitHub repositories by generating outlines and reading specific code sections. Use when you need to understand, reference, or analyze source code for a project. Ideal for code review, architecture design, or learning a new codebase.
---

# Read-Repo

This skill provides a structured workflow to read and understand GitHub repositories. It is designed to be used by both human users for code exploration and by other agents for tasks like architecture design or code generation that require context from an existing codebase.

## When to use this skill
- When a user asks to "read the code for X", "understand project Y", or "analyze the Z repository".
- When another agent needs to reference an existing project for design or implementation tasks.
- When you need to explore a codebase without cloning it locally.

## When NOT to use this skill
- To get a general summary of a project (a web search might be better).
- To ask general programming questions not specific to a repository.
- To execute or run the code from the repository.

## Default Workflow
Follow this workflow unless the user explicitly asks to run a specific command (like `list` or `ask`).

### 1. Identify the Target Repository
- **If the user provides a repository name** (e.g., `owner/repo`) or a GitHub URL, proceed directly to Step 2.
- **If the repository is not specified**, or if this skill was triggered by another agent, you must first determine the target repository. Use web search or interact with the user/parent agent to clarify which project to analyze. You can analyze multiple repositories sequentially if needed.

### 2. Get the Repository Outline
Once the repository is identified, generate a navigable outline of its documentation/code. This outline includes line numbers, which are crucial for the next step.

**Command:**
```bash
pnpm exec tsx skills/read-repo/scripts/repo.ts read outline --repo <owner>/<repo>
```

**Example:**
```bash
pnpm exec tsx skills/read-repo/scripts/repo.ts read outline --repo karpathy/nanoGPT
```

**Action:**
- Execute the command.
- The output is a Markdown-formatted outline with headings and their corresponding line numbers. Store this outline for the next step.
- If this is the first time reading this repo, the script will first fetch the full content and cache it before generating the outline. This may take a moment.

### 3. Read Specific Content by Range
Using the outline from Step 2, identify the most relevant section(s) to read. Select a line range to read the specific content.

- **Guideline:** Keep ranges to a reasonable size (e.g., under 1000 lines) to manage context. If a section is very large, read it in smaller chunks.

**Command:**
```bash
pnpm exec tsx skills/read-repo/scripts/repo.ts read content --repo <owner>/<repo> --range "<start_line>-<end_line>"
```

**Example:**
```bash
# After reviewing the outline, you decide to read the 'train.py' section which starts at line 850
pnpm exec tsx skills/read-repo/scripts/repo.ts read content --repo karpathy/nanoGPT --range "850-1100"
```

**Action:**
- Execute the command with the chosen line range.
- The script will print the content from the local cache for that specific range.

### 4. (Optional) View Raw Source Code from GitHub
After analyzing the outline or content, you might want to view the original source file for precise details. This step allows you to fetch a specific range of lines directly from a file on GitHub. This is different from Step 3, as it fetches from the live repository, not the local cache.

**Use Case:** When you need to see the exact implementation of a function or check the latest version of a file identified in the outline.

**Command:**
```bash
curl -L https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path/to/file> | sed -n '<start_line>,<end_line>p'
```

**Example:**
```bash
# View lines 20-35 of the 'train.py' file from the 'main' branch of karpathy/nanoGPT
curl -L https://raw.githubusercontent.com/karpathy/nanoGPT/main/train.py | sed -n '20,35p'
```

**Action:**
- You need to know the file path within the repository, which you can often infer from the outline generated in Step 2.
- Replace the placeholders `<owner>`, `<repo>`, `<branch>`, `<path/to/file>`, `<start_line>`, and `<end_line>` with the correct values.

### 5. Present the Results
Combine the information gathered and present it clearly.

- **For a human user:** Show the content you read, and provide the outline as context. Mention the source and line numbers.
  > Example Response: "Here is the content from `karpathy/nanoGPT` (Lines 850-1100) regarding the training loop: ... You can refer to the full outline to explore other sections."

- **For another agent:** Output the content along with the metadata (repository name, line range) and the full outline as structured data.

---

These commands can be used to interact with the skill directly, bypassing the default workflow.

### `list`: List Repositories
- **List all available repositories on the server:**
  ```bash
  pnpm exec tsx skills/read-repo/scripts/repo.ts list
  ```
- **List only locally cached repositories and their last update time:**
  ```bash
  pnpm exec tsx skills/read-repo/scripts/repo.ts list --cached
  ```

### `read`: Force Refresh or Read Structure
- **Force a fresh download from the server, ignoring the cache:**
  ```bash
  pnpm exec tsx skills/read-repo/scripts/repo.ts read content --repo <owner>/<repo> --without-cache
  ```
- **Read the high-level `structure` file instead of the full `content`:**
  ```bash
  pnpm exec tsx skills/read-repo/scripts/repo.ts read structure --repo <owner>/<repo>
  ```

### `ask`: Ask a Question
- **Ask a question about a repository. This is sent to the DeepWiki service for an AI-generated answer.**
  ```bash
  pnpm exec tsx skills/read-repo/scripts/repo.ts ask --repo <owner>/<repo> --question "Your question here"
  ```
