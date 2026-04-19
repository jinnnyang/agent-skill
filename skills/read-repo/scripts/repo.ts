// skills/read-repo/scripts/repo.ts

import { parseArgs } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { DeepWikiFetcher, DEFAULT_SERVER_URL, MCPError, RequestError } from './deepwiki_helper.js';

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
    const columnWidths = headers.map(h => h.length);
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
    console.log(columnWidths.map(w => '-'.repeat(w)).join('  '));
    for (const row of data) {
        console.log(row.map((c, i) => String(c).padEnd(columnWidths[i])).join('  '));
    }
}

async function listCachedRepos() {
    if (!existsSync(REFERENCES_DIR)) {
        console.log("Cache directory not found.");
        return;
    }

    const repoList: [string, string, string][] = [];
    const authorDirs = await fs.readdir(REFERENCES_DIR, { withFileTypes: true });

    for (const authorDir of authorDirs) {
        if (authorDir.isDirectory()) {
            const repoDirs = await fs.readdir(path.join(REFERENCES_DIR, authorDir.name), { withFileTypes: true });
            for (const repoDir of repoDirs) {
                if (repoDir.isDirectory()) {
                    const repoName = repoDir.name;
                    const fullRepoName = `${authorDir.name}/${repoName}`;
                    let latestMtime = 0;

                    const files = await fs.readdir(path.join(REFERENCES_DIR, fullRepoName), { withFileTypes: true });
                    for (const file of files) {
                        if (file.isFile()) {
                            const stat = statSync(path.join(REFERENCES_DIR, fullRepoName, file.name));
                            if (stat.mtimeMs > latestMtime) {
                                latestMtime = stat.mtimeMs;
                            }
                        }
                    }

                    const lastUpdate = latestMtime > 0 
                        ? new Date(latestMtime).toISOString().replace('T', ' ').substring(0, 19)
                        : "N/A";
                    
                    repoList.push([authorDir.name, repoName, lastUpdate]);
                }
            }
        }
    }

    if (repoList.length === 0) {
        console.log("No cached repositories found.");
        return;
    }

    repoList.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

    const cachedReposData = repoList.map((item, index) => [index + 1, ...item]);
    printTable(["No.", "Author", "Repository", "Last update"], cachedReposData);
}

function generateMarkdownOutline(content: string) {
    const headingPattern = /^(#+)\s+(.*)/;
    let foundHeadings = false;
    
    console.log("\n--- File Outline ---");
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
        const match = line.match(headingPattern);
        if (match) {
            foundHeadings = true;
            const level = match[1].length;
            const title = match[2].trim();
            const indent = "  ".repeat(level - 1);
            console.log(`${indent}- (Line: ${index + 1}) ${title}`);
        }
    });

    if (!foundHeadings) {
        console.log("No headings found in the content.");
    }
}

async function handleRead(options: any, positionals: string[], client: DeepWikiFetcher) {
    if (positionals.length === 0) {
        console.error("Error: Missing data_type argument (structure, content, or outline).");
        process.exit(1);
    }
    
    const dataType = positionals[0];
    if (!["structure", "content", "outline"].includes(dataType)) {
         console.error("Error: Invalid data_type. Use structure, content, or outline.");
         process.exit(1);
    }

    const repoName = options.repo;
    if (!repoName) {
        console.error("Error: Missing --repo argument.");
        process.exit(1);
    }

    const effectiveDataType = dataType === "outline" ? "content" : dataType;

    if (options.range) {
        if (dataType !== "content") {
            console.error("Error: --range can only be used with 'content' data_type.");
            process.exit(1);
        }
        if (options['without-cache']) {
            console.error("Error: --range cannot be used with --without-cache. Content must be read from cache.");
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
            console.error("Error: Invalid range format. Start must be > 0 and <= end.");
            process.exit(1);
        }

        const cachedContent = await readFromCache(repoName, effectiveDataType);
        if (!cachedContent) {
            console.error(`Error: No cached content found for '${repoName}'. Cannot use --range without cached data.`);
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
            if (dataType === "outline") {
                generateMarkdownOutline(cachedContent);
            } else {
                console.log(cachedContent);
            }
            return;
        }
    }

    try {
        let content;
        if (effectiveDataType === "structure") {
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

            if (dataType === "outline") {
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

async function handleAsk(options: any, client: DeepWikiFetcher) {
    if (!options.repo || !options.question) {
        console.error("Error: Output requires both --repo and --question arguments.");
        process.exit(1);
    }

    try {
        const result = await client.askQuestion(options.repo, options.question);
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

async function main() {
    const serverUrl = process.env.MCP_SERVER_URL || DEFAULT_SERVER_URL;
    const client = new DeepWikiFetcher(serverUrl);

    const command = process.argv[2];
    const args = process.argv.slice(3);

    if (!command) {
        console.error("Error: Missing command (read, ask, list).");
        process.exit(1);
    }

    if (command === "read") {
        const { values, positionals } = parseArgs({
            args,
            options: {
                repo: { type: 'string' },
                'without-cache': { type: 'boolean' },
                range: { type: 'string' }
            },
            allowPositionals: true
        });
        await handleRead(values, positionals, client);
    } else if (command === "ask") {
        const { values } = parseArgs({
            args,
            options: {
                repo: { type: 'string' },
                question: { type: 'string' }
            }
        });
        await handleAsk(values, client);
    } else if (command === "list") {
        const { values } = parseArgs({
            args,
            options: {
                'without-cache': { type: 'boolean' }
            }
        });
        await handleList(values, client);
    } else {
        console.error(`Error: Unknown command '${command}'`);
        process.exit(1);
    }

    // CONTINUOUS GUIDANCE MECHANISM
    // Output a brief guidance string explicitly advising the parent Agent's execution flow.
    const guideOutput = command === "list" 
      ? "\n[AGENT GUIDANCE] Target an available repository with 'read outline' to explore its contents."
      : (command === "read" && !process.argv.includes("--range")) 
      ? "\n[AGENT GUIDANCE] To deeply inspect an implementation block, use 'read content --range' referencing lines detailed above."
      : "\n[AGENT GUIDANCE] Proceed with reading and validating implementation blocks or integrating extracted components.";
    
    console.log(guideOutput);
}

main().catch(e => {
    console.error("Unexpected error:", e);
    process.exit(1);
});
