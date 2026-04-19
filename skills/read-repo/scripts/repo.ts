import { parseArgs } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { DeepWikiFetcher, DEFAULT_SERVER_URL } from './deepwiki_helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// The script is in skills/read-repo/scripts/
const SKILL_ROOT = path.resolve(__dirname, '..');
const REFERENCES_DIR = path.join(SKILL_ROOT, 'references');

function getCachePath(repoName: string, dataType: string): string {
  return path.join(REFERENCES_DIR, repoName, `${dataType}.md`);
}

async function readFromCache(repoName: string, dataType: string): Promise<string | null> {
  const cachePath = getCachePath(repoName, dataType);
  if (existsSync(cachePath)) {
    try {
      return await fs.readFile(cachePath, 'utf-8');
    } catch (e) {
      return null;
    }
  }
  return null;
}

async function writeToCache(repoName: string, dataType: string, content: string): Promise<void> {
  const cachePath = getCachePath(repoName, dataType);
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, content, 'utf-8');
  } catch (e: any) {
    console.error(`Warning: Failed to write to cache file ${cachePath}. Error: ${e.message}`);
  }
}

function printTable(headers: string[], data: any[][]) {
  const columnWidths = headers.map((h) => h.length);
  for (const row of data) {
    row.forEach((cell, i) => {
      const cellLength = String(cell).length;
      if (cellLength > columnWidths[i]) {
        columnWidths[i] = cellLength;
      }
    });
  }

  const headerLine = headers.map((h, i) => h.padEnd(columnWidths[i])).join('  ');
  console.log(headerLine);
  console.log(columnWidths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of data) {
    console.log(row.map((c, i) => String(c).padEnd(columnWidths[i])).join('  '));
  }
}

async function listCachedRepos() {
  if (!existsSync(REFERENCES_DIR)) {
    console.log('Cache directory not found.');
    return;
  }

  const repoList: [string, string, string][] = [];
  const authorDirs = await fs.readdir(REFERENCES_DIR, { withFileTypes: true });

  for (const authorDir of authorDirs) {
    if (authorDir.isDirectory()) {
      const repoDirs = await fs.readdir(path.join(REFERENCES_DIR, authorDir.name), {
        withFileTypes: true,
      });
      for (const repoDir of repoDirs) {
        if (repoDir.isDirectory()) {
          const repoName = repoDir.name;
          const fullRepoName = `${authorDir.name}/${repoName}`;
          let latestMtime = 0;

          const files = await fs.readdir(path.join(REFERENCES_DIR, fullRepoName), {
            withFileTypes: true,
          });
          for (const file of files) {
            if (file.isFile()) {
              const stat = statSync(path.join(REFERENCES_DIR, fullRepoName, file.name));
              if (stat.mtimeMs > latestMtime) {
                latestMtime = stat.mtimeMs;
              }
            }
          }

          const lastUpdate =
            latestMtime > 0
              ? new Date(latestMtime).toISOString().replace('T', ' ').substring(0, 19)
              : 'N/A';

          repoList.push([authorDir.name, repoName, lastUpdate]);
        }
      }
    }
  }

  if (repoList.length === 0) {
    console.log('No cached repositories found.');
    return;
  }

  repoList.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  const cachedReposData = repoList.map((item, index) => [index + 1, ...item]);
  printTable(['No.', 'Author', 'Repository', 'Last update'], cachedReposData);
}

function generateMarkdownOutline(content: string) {
  const headingPattern = /^(#+)\s+(.*)/;
  let foundHeadings = false;

  console.log('\n--- File Outline ---');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(headingPattern);
    if (match) {
      foundHeadings = true;
      const level = match[1].length;
      const title = match[2].trim();
      const indent = '  '.repeat(level - 1);
      console.log(`${indent}- (Line: ${index + 1}) ${title}`);
    }
  });

  if (!foundHeadings) {
    console.log('No headings found in the content.');
  }
}

function extractRepoName(urlOrRaw: string): string {
  try {
    if (urlOrRaw.startsWith('http://') || urlOrRaw.startsWith('https://')) {
      const parsed = new URL(urlOrRaw);
      let pathPart = parsed.pathname.replace(/^\/+/, '');
      pathPart = pathPart.replace(/\.git$/, '');
      const parts = pathPart.split('/');
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    }
  } catch {}
  return urlOrRaw.trim().replace(/\.git$/, '');
}

async function handleRead(options: any, positionals: string[], client: DeepWikiFetcher) {
  if (positionals.length === 0) {
    console.error('Error: Missing data_type argument (structure, content, or outline).');
    process.exit(1);
  }

  const dataType = positionals[0];
  if (!['structure', 'content', 'outline'].includes(dataType)) {
    console.error('Error: Invalid data_type. Use structure, content, or outline.');
    process.exit(1);
  }

  const rawUrl = positionals[1] || options.url;
  if (!rawUrl) {
    console.error('Error: Missing target repository or URL.');
    process.exit(1);
  }
  const repoName = extractRepoName(rawUrl);

  const effectiveDataType = dataType === 'outline' ? 'content' : dataType;

  if (options.range) {
    if (dataType !== 'content') {
      console.error("Error: --range can only be used with 'content' data_type.");
      process.exit(1);
    }
    if (options['without-cache']) {
      console.error(
        'Error: --range cannot be used with --without-cache. Content must be read from cache.'
      );
      process.exit(1);
    }

    const parts = String(options.range).split('-');
    if (parts.length !== 2) {
      console.error("Error: Invalid range format. Please use 'start-end', e.g., '100-250'.");
      process.exit(1);
    }

    const startLine = parseInt(parts[0], 10);
    const endLine = parseInt(parts[1], 10);

    if (isNaN(startLine) || isNaN(endLine) || startLine <= 0 || endLine < startLine) {
      console.error('Error: Invalid range format. Start must be > 0 and <= end.');
      process.exit(1);
    }

    const cachedContent = await readFromCache(repoName, effectiveDataType);
    if (!cachedContent) {
      console.error(
        `Error: No cached content found for '${repoName}'. Cannot use --range without cached data.`
      );
      process.exit(1);
    }

    const lines = cachedContent.split(/\r?\n/);
    for (let i = 1; i <= lines.length; i++) {
      if (i >= startLine) {
        if (i > endLine) break;
        console.log(lines[i - 1]);
      }
    }
    return;
  }

  if (!options['without-cache']) {
    const cachedContent = await readFromCache(repoName, effectiveDataType);
    if (cachedContent !== null) {
      if (dataType === 'outline') {
        generateMarkdownOutline(cachedContent);
      } else {
        console.log(cachedContent);
      }
      return;
    }
  }

  try {
    let content;
    if (effectiveDataType === 'structure') {
      content = await client.fetchStructure(repoName);
    } else {
      content = await client.fetchContents(repoName);
    }

    if (content) {
      let contentStr: string;
      if (typeof content === 'object') {
        contentStr = JSON.stringify(content, null, 2);
      } else {
        contentStr = String(content);
      }

      await writeToCache(repoName, effectiveDataType, contentStr);

      if (dataType === 'outline') {
        generateMarkdownOutline(contentStr);
      } else {
        console.log(contentStr);
      }
    } else {
      console.error(`No ${effectiveDataType} content received for repository '${repoName}'.`);
    }
  } catch (e: any) {
    console.error(`An error occurred while fetching data: ${e.message}`);
    process.exit(1);
  }
}

async function handleAsk(options: any, positionals: string[], client: DeepWikiFetcher) {
  const rawUrl = positionals[0] || options.url;
  if (!rawUrl || !options.question) {
    console.error('Error: Output requires a target repository and --question argument.');
    process.exit(1);
  }
  const repoName = extractRepoName(rawUrl);

  try {
    const result = await client.askQuestion(repoName, options.question);
    if (result) {
      if (typeof result === 'object') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result);
      }
    }
  } catch (e: any) {
    console.error(`An error occurred: ${e.message}`);
    process.exit(1);
  }
}

async function handleList(options: any, client: DeepWikiFetcher) {
  if (!options['without-cache']) {
    await listCachedRepos();
  } else {
    try {
      const result = await client.listRepos();
      if (result) {
        if (typeof result === 'object') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result);
        }
      }
    } catch (e: any) {
      console.error(`An error occurred: ${e.message}`);
      process.exit(1);
    }
  }
}

async function handleSearch(options: any) {
  const keywordsStr = options.keywords || '';
  const keywords = keywordsStr.split(/\s+/).filter((kw: string) => kw.length > 0);

  if (keywords.length === 0) {
    console.error('Error: --keywords argument is required for search.');
    process.exit(1);
  }

  const topK = parseInt(options.topK || '5', 10);
  const windowSize = parseInt(options.window || '25', 10);

  if (!existsSync(REFERENCES_DIR)) {
    console.log('No repositories cached yet.');
    return;
  }

  const hitRepos: { repoName: string; hitCount: number; snippet: string }[] = [];
  const authorDirs = await fs.readdir(REFERENCES_DIR, { withFileTypes: true });

  for (const authorDir of authorDirs) {
    if (!authorDir.isDirectory()) continue;

    const repoDirs = await fs.readdir(path.join(REFERENCES_DIR, authorDir.name), {
      withFileTypes: true,
    });
    for (const repoDir of repoDirs) {
      if (!repoDir.isDirectory()) continue;

      const repoPath = path.join(REFERENCES_DIR, authorDir.name, repoDir.name);
      const contentPath = path.join(repoPath, 'content.md');

      if (existsSync(contentPath)) {
        try {
          const content = await fs.readFile(contentPath, 'utf-8');
          const lowerContent = content.toLowerCase();

          // Rule: ALL keywords must appear at least once
          const matchesAll = keywords.every((kw: string) =>
            lowerContent.includes(kw.toLowerCase())
          );

          if (matchesAll) {
            // Count occurrences of each keyword
            let totalHits = 0;
            for (const kw of keywords) {
              const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(escapedKw, 'gi');
              const matches = content.match(regex);
              if (matches) totalHits += matches.length;
            }

            // Extract snippet: strip XML blocks and get first N non-dialogue lines
            // Typically <outline> or <details> wrap meta info or TOCs
            let cleanContent = content.replace(
              /<(outline|details|summary|title|meta)[^>]*>[\s\S]*?<\/\1>/gi,
              ''
            );
            // Remove any remaining XML tags
            cleanContent = cleanContent.replace(/<[^>]+>/g, '');

            const lines = cleanContent.split(/\r?\n/);
            const snippetLines: string[] = [];
            const dialoguePrefixes = [
              'user:',
              'human:',
              'ai:',
              'assistant:',
              'system:',
              'bot:',
              'you:',
            ];

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              const isDialogue = dialoguePrefixes.some((p) => trimmed.toLowerCase().startsWith(p));
              if (!isDialogue) {
                snippetLines.push(line);
              }

              if (snippetLines.length >= windowSize) break;
            }

            hitRepos.push({
              repoName: `${authorDir.name}/${repoDir.name}`,
              hitCount: totalHits,
              snippet: snippetLines.join('\n'),
            });
          }
        } catch (e: any) {
          console.error(`Warning: Failed to read ${contentPath}: ${e.message}`);
        }
      }
    }
  }

  if (hitRepos.length === 0) {
    console.log(
      '\n[AGENT GUIDANCE] 提醒智能体搜索规则：关键词必须在content.md中都出现过至少一次。如果没有任何命中，请尝试减少并列词或更换搜索词。不建议连续检索超过2次，如超过建议询问主循环AGENT或USER建议。'
    );
    return;
  }

  // Sort by hitCount descending
  hitRepos.sort((a, b) => b.hitCount - a.hitCount);

  const results = hitRepos.slice(0, topK);
  results.forEach((repo, index) => {
    console.log(`## No. ${index + 1}：${repo.repoName} (Hitted ${repo.hitCount} times)`);
    console.log('```plain');
    console.log(repo.snippet);
    console.log('```');
    console.log();
  });

  console.log(
    '\n[AGENT GUIDANCE] 提醒AGENT 选择与当前任务相关的文档，先使用 repo read outline <username>/<repository> 读取大纲后，按需使用 repo read conten --range <start>-<end> 读取。'
  );
}

async function main() {
  const serverUrl = process.env.MCP_SERVER_URL || DEFAULT_SERVER_URL;
  const client = new DeepWikiFetcher(serverUrl);

  const command = process.argv[2];
  const args = process.argv.slice(3);

  if (!command) {
    console.error('Error: Missing command (read, ask, list, search).');
    process.exit(1);
  }

  if (command === 'read') {
    const { values, positionals } = parseArgs({
      args,
      options: {
        url: { type: 'string' },
        'without-cache': { type: 'boolean' },
        range: { type: 'string' },
      },
      allowPositionals: true,
    });
    await handleRead(values, positionals, client);
  } else if (command === 'ask') {
    const { values, positionals } = parseArgs({
      args,
      options: {
        url: { type: 'string' },
        question: { type: 'string' },
      },
      allowPositionals: true,
    });
    await handleAsk(values, positionals, client);
  } else if (command === 'list') {
    const { values } = parseArgs({
      args,
      options: {
        'without-cache': { type: 'boolean' },
      },
    });
    await handleList(values, client);
  } else if (command === 'search') {
    const { values } = parseArgs({
      args,
      options: {
        keywords: { type: 'string' },
        topK: { type: 'string' },
        window: { type: 'string' },
      },
    });
    await handleSearch(values);
    return; // handleSearch has its own guidance
  } else {
    console.error(`Error: Unknown command '${command}'`);
    process.exit(1);
  }

  // CONTINUOUS GUIDANCE MECHANISM
  // Output a brief guidance string explicitly advising the parent Agent's execution flow.
  const guideOutput =
    command === 'list'
      ? "\n[AGENT GUIDANCE] Target an available repository with 'read outline' to explore its contents."
      : command === 'read' && !process.argv.includes('--range')
        ? "\n[AGENT GUIDANCE] To deeply inspect an implementation block, use 'read content --range' referencing lines detailed above."
        : '\n[AGENT GUIDANCE] Proceed with reading and validating implementation blocks or integrating extracted components.';

  console.log(guideOutput);
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
