import * as fs from 'fs';
import * as path from 'path';
import { parseArgs } from 'util';
import { fileURLToPath } from 'url';
import * as crypto from 'crypto';

// --- Types ---

interface Feed {
  id: string;
  name: string;
  url: string;
  description: string;
}

interface Article {
  id: string;
  feedId: string;
  title: string;
  url: string;
  isRead: boolean;
  publishedDate: number;
  description: string;
  keywords: string[];
  tags: string[];
}

interface ParsedOptions {
  values: {
    name?: string;
    url?: string;
    description?: string;
    id?: string;
    filename?: string;
    recentK?: string;
    all?: boolean;
    query?: string;
    feed?: string;
    help?: boolean;
  };
}

type HelpEntry = string | { _default: string; [key: string]: string };

// --- Constants & Paths ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(SKILL_ROOT, 'assets');
const FEEDS_FILE = path.join(ASSETS_DIR, 'feeds.json');
const ITEMS_FILE = path.join(ASSETS_DIR, 'items.json');
const ARTICLES_DIR = path.join(ASSETS_DIR, 'articles');
const ARCHIVE_DIR = path.join(ASSETS_DIR, 'archive');

const MAX_ITEMS = 2048;
const ARCHIVE_COUNT = 1024;

// --- Logger (centralizes console access) ---

const logger = {
  // eslint-disable-next-line no-console
  log: (msg: string) => console.log(msg),
};

function log(msg: string) {
  logger.log(msg);
}

function guidance(msg: string) {
  logger.log(`\n[AGENT GUIDANCE] ${msg}`);
}

// --- Helpers ---

function ensureDirs() {
  [ASSETS_DIR, ARTICLES_DIR, ARCHIVE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function readJSON<T>(file: string, defaultValue: T): T {
  if (!fs.existsSync(file)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

function writeJSON(file: string, data: Feed[] | Article[]) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function safeFetch(url: string, timeoutMs: number = 15000): Promise<Response> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8,zh-HK;q=0.7,en-US;q=0.6,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-GPC': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Priority': 'u=0, i'
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// --- RSS Parser (Regex Based) ---

function unescapeXML(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}(?:\\s+[^>]*?)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i'));
  if (!match) return '';
  return (match[1] || match[2] || '').trim();
}

function extractTags(xml: string, tag: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`<${tag}(?:\\s+[^>]*?)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'gi');
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push((match[1] || match[2] || '').trim());
  }
  return results;
}

function parseFeedXML(xml: string, feedId: string): Article[] {
  const articles: Article[] = [];
  
  // Two-stage parsing: RSS (item) or Atom (entry)
  const isAtom = xml.includes('<entry');
  const blocks = isAtom ? xml.split(/<entry[\s>]/i).slice(1) : xml.split(/<item[\s>]/i).slice(1);

  for (let block of blocks) {
    const endTag = isAtom ? '</entry>' : '</item>';
    block = block.split(new RegExp(endTag, 'i'))[0];

    const title = unescapeXML(extractTag(block, 'title'));
    const link = isAtom 
      ? (block.match(/<link(?:\s+[^>]*?)?\s+href="([^"]+)"/i)?.[1] || '')
      : extractTag(block, 'link');
    const description = unescapeXML(extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content:encoded') || extractTag(block, 'content'));
    const pubDateStr = isAtom ? (extractTag(block, 'published') || extractTag(block, 'updated')) : extractTag(block, 'pubDate');
    const rawDate = pubDateStr ? new Date(pubDateStr).getTime() : Date.now();
    const publishedDate = isNaN(rawDate) ? Date.now() : rawDate;
    
    const tags = extractTags(block, 'tag').concat(extractTags(block, 'category'));
    const keywords = extractTags(block, 'keyword');

    if (title && link) {
      const id = crypto.createHash('md5').update(link).digest('hex');
      articles.push({
        id,
        feedId,
        title,
        url: link,
        isRead: false,
        publishedDate,
        description: description.substring(0, 500), // Limit summary size
        keywords,
        tags
      });
    }
  }

  return articles;
}

// --- HTML to Markdown converter ---

function htmlToMarkdown(html: string, title: string, url: string, date: string): string {
  let md = `# ${title}\n\nSource: ${url}\nDate: ${date}\n\n`;
  let body = html;
  
  // Try to isolate js_content or article
  const jsContentIdx = body.indexOf('id="js_content"');
  if (jsContentIdx !== -1) {
    body = body.substring(jsContentIdx);
  } else {
    const articleIdx = body.indexOf('<article');
    if (articleIdx !== -1) {
      body = body.substring(articleIdx);
    } else {
      const bodyIdx = body.indexOf('<body');
      if (bodyIdx !== -1) body = body.substring(bodyIdx);
    }
  }

  // Strip noise blocks, including massive Base64 images
  body = body.replace(/<(script|style|svg|noscript|iframe|nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  body = body.replace(/<!--[\s\S]*?-->/g, '');
  body = body.replace(/src="data:image\/[^;]+;base64,[^"]+"/gi, 'src="[base64_image]"');

  // Pre / Code blocks
  body = body.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, codes: string) => {
    const cleanCode = codes.replace(/<[^>]+>/g, '').trim();
    return `\n\n\`\`\`\n${cleanCode}\n\`\`\`\n\n`;
  });
  body = body.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code: string) => {
    return `\`${code.replace(/<[^>]+>/g, '')}\``;
  });

  // Replace structural tags with newlines instead of matching content (solves nesting issue)
  body = body.replace(/<\/?(?:div|p|section|article|header|form)[^>]*>/gi, '\n\n');
  body = body.replace(/<br\s*\/?>/gi, '\n');
  body = body.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n\n');
  body = body.replace(/<li[^>]*>/gi, '\n- ');
  body = body.replace(/<\/li>/gi, '');

  // Headings
  body = body.replace(/<h([1-6])[^>]*>/gi, (_, level: string) => '\n\n' + '#'.repeat(parseInt(level)) + ' ');
  body = body.replace(/<\/h[1-6]>/gi, '\n\n');

  // Inline styling
  body = body.replace(/<strong[^>]*>/gi, '**').replace(/<\/strong>/gi, '**');
  body = body.replace(/<b[^>]*>/gi, '**').replace(/<\/b>/gi, '**');
  body = body.replace(/<em[^>]*>/gi, '*').replace(/<\/em>/gi, '*');

  // Links
  body = body.replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Images (WeChat uses data-src mostly)
  body = body.replace(/<img[^>]+?(?:data-src|src)="([^"]+)"[^>]*>/gi, (full, src: string) => {
    const alt = full.match(/alt="([^"]+)"/i)?.[1] || 'image';
    return `\n![${alt}](${src})\n`;
  });

  // Blockquotes
  body = body.replace(/<blockquote[^>]*>/gi, '\n\n> ');
  body = body.replace(/<\/blockquote>/gi, '\n\n');

  // Strip remaining HTML tags
  body = body.replace(/<[^>]+>/g, '');

  // Unescape and normalize spacing
  body = unescapeXML(body)
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&#39;/g, "'");
    
  body = body.replace(/^[ \t]+/gm, ''); // remove leading line spaces
  body = body.replace(/\n\s*\n\s*\n+/g, '\n\n'); // collapse to max two newlines

  md += body.trim();
  return md;
}

// --- Commands ---

async function cmdFeeds(args: string[], options: ParsedOptions) {
  const sub = args[0];
  const feeds = readJSON<Feed[]>(FEEDS_FILE, []);

  switch (sub) {
    case 'add': {
      const { name, description } = options.values;
      let feedUrl = options.values.url;
      if (!name || !feedUrl) throw new Error('Missing --name or --url');
      
      // Auto-discovery logic if URL doesn't look like an RSS feed initially
      if (!feedUrl.endsWith('.xml') && !feedUrl.includes('feed') && !feedUrl.includes('rss')) {
        try {
          const res = await safeFetch(feedUrl, 10000);
          const html = await res.text();
          const linkMatch = html.match(/<link[^>]+type="application\/(?:rss\+xml|atom\+xml)"[^>]+href="([^"]+)"/i);
          if (linkMatch?.[1]) {
            const discoveredUrl = new URL(linkMatch[1], feedUrl).href;
            log(`Auto-discovered feed URL: ${discoveredUrl}`);
            feedUrl = discoveredUrl;
          }
        } catch {
          // Ignore fetch error in auto-discovery, proceed with original url
        }
      }

      feeds.push({ id: crypto.randomUUID(), name, url: feedUrl, description: description || '' });
      writeJSON(FEEDS_FILE, feeds);
      log(`Added feed: ${name}`);
      break;
    }

    case 'list': {
      if (feeds.length === 0) {
        log('No feeds found.');
      } else {
        log('| Name | URL | Description |');
        log('| --- | --- | --- |');
        feeds.forEach(f => log(`| ${f.name} | ${f.url} | ${f.description} |`));
      }
      guidance('To fetch updates, run `read`. Manage feeds with `add --name <n> --url <u>` or `remove --name <n>`.');
      break;
    }

    case 'remove': {
      const target = options.values.name || options.values.url || options.values.id;
      const filtered = feeds.filter(f => f.name !== target && f.url !== target && f.id !== target);
      writeJSON(FEEDS_FILE, filtered);
      log(`Removed feed matching: ${target}`);
      break;
    }

    case 'import': {
      const opmlUrl = options.values.url;
      const filename = options.values.filename;
      let content = '';
      if (opmlUrl) {
        const res = await safeFetch(opmlUrl);
        content = await res.text();
      } else if (filename) {
        content = fs.readFileSync(filename, 'utf-8');
      } else {
        throw new Error('Provide --url or --filename');
      }

      const matches = content.matchAll(/<outline[^>]+(?:title|text)="([^"]+)"[^>]+xmlUrl="([^"]+)"/gi);
      let count = 0;
      for (const m of matches) {
        if (!feeds.find(f => f.url === m[2])) {
          feeds.push({ id: crypto.randomUUID(), name: m[1], url: m[2], description: '' });
          count++;
        }
      }
      writeJSON(FEEDS_FILE, feeds);
      log(`Imported ${count} new feeds.`);
      break;
    }

    case 'export': {
      let opml = '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.0">\n<head><title>RSS Feeds Export</title></head>\n<body>\n';
      feeds.forEach(f => {
        const cleanName = f.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const cleanUrl = f.url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        opml += `  <outline text="${cleanName}" title="${cleanName}" type="rss" xmlUrl="${cleanUrl}"/>\n`;
      });
      opml += '</body>\n</opml>';
      const outFilename = options.values.filename || `feeds-export-${Date.now()}.opml`;
      fs.writeFileSync(outFilename, opml, 'utf-8');
      log(`Exported ${feeds.length} feeds to ${outFilename}`);
      break;
    }

    case 'read': {
      await cmdRead(options);
      break;
    }

    default:
      log('Unknown feeds subcommand. Use add, list, remove, import, export, config, read.');
  }
}

async function cmdRead(options: ParsedOptions) {
  const feeds = readJSON<Feed[]>(FEEDS_FILE, []);
  const items = readJSON<Article[]>(ITEMS_FILE, []);
  const targetName = options.values.name;
  
  const toProcess = targetName ? feeds.filter(f => f.name === targetName) : feeds;
  log(`Fetching updates for ${toProcess.length} feeds...`);

  let newCount = 0;
  await Promise.all(toProcess.map(async (feed) => {
    try {
      const res = await safeFetch(feed.url);
      const xml = await res.text();
      const fetched = parseFeedXML(xml, feed.id);
      
      for (const art of fetched) {
        if (!items.find(i => i.id === art.id)) {
          items.push(art);
          newCount++;
        }
      }
    } catch (err: unknown) {
      log(`Error fetching ${feed.name}: ${getErrorMessage(err)}`);
    }
  }));

  // Archiving logic
  if (items.length > MAX_ITEMS) {
    items.sort((a, b) => b.publishedDate - a.publishedDate);
    const toArchive = items.splice(ARCHIVE_COUNT);
    const archivePath = path.join(ARCHIVE_DIR, `${Date.now()}.json`);
    writeJSON(archivePath, toArchive);
    log(`Archived ${toArchive.length} old items to ${archivePath}`);
  }

  writeJSON(ITEMS_FILE, items);
  log(`Done. Found ${newCount} new articles.`);
  guidance('Use `articles list` to see recent news or `articles search --query <term>` to find specific topics.');
}

async function cmdArticles(args: string[], options: ParsedOptions) {
  const sub = args[0];
  const items = readJSON<Article[]>(ITEMS_FILE, []);

  switch (sub) {
    case 'list': {
      const limit = options.values.recentK ? parseInt(options.values.recentK) : 10;
      const feedFilter = options.values.feed;
      const list = items
        .filter(i => (options.values.all ? true : !i.isRead))
        .filter(i => feedFilter ? (i.feedId === feedFilter || i.id === feedFilter) : true)
        .sort((a, b) => b.publishedDate - a.publishedDate)
        .slice(0, limit);
      
      log('| ID | Date | Title | Feed |');
      log('| --- | --- | --- | --- |');
      list.forEach(i => log(`| ${i.id} | ${new Date(i.publishedDate).toISOString().split('T')[0]} | ${i.title} | ${i.feedId} |`));
      
      guidance('To read an article, use `articles read --id <ID>`. Usage: `articles list [--recentK <number>] [--all] [--feed <id/name>]`');
      break;
    }

    case 'search': {
      const query = (options.values.query || '').toLowerCase();
      const results = items.filter(i => 
        i.title.toLowerCase().includes(query) || 
        i.description.toLowerCase().includes(query) ||
        i.tags.some(t => t.toLowerCase().includes(query)) ||
        i.keywords.some(k => k.toLowerCase().includes(query))
      );
      log(`Found ${results.length} results for "${query}":`);
      results.slice(0, 20).forEach(i => log(`- [${i.id}] ${i.title}`));
      guidance('Use `articles read --id <ID>` to see content, or `articles search --query <new-term>` to refine.');
      break;
    }

    case 'read': {
      const articleId = options.values.id;
      const art = items.find(i => i.id === articleId);
      if (!art) throw new Error('Article not found');

      const fileName = `${art.id}.md`;
      const filePath = path.join(ARTICLES_DIR, fileName);

      if (fs.existsSync(filePath)) {
        log(fs.readFileSync(filePath, 'utf-8'));
      } else {
        log(`Fetching full content from ${art.url}...`);
        try {
          const res = await safeFetch(art.url);
          const html = await res.text();
          const md = htmlToMarkdown(html, art.title, art.url, new Date(art.publishedDate).toISOString());
          
          fs.writeFileSync(filePath, md);
          
          if (md.length > 6000) {
            log(md.slice(0, 6000) + `\n\n[...文稿过长已截断（剩余 ${md.length - 6000} 字符）。完整全文已保存至：${filePath}]`);
            guidance(`如需研读被截断的内容，请使用文件读取工具(如view_file)查阅: ${filePath}`);
          } else {
            log(md);
          }
        } catch (err: unknown) {
          log(`Failed to fetch article: ${getErrorMessage(err)}`);
        }
      }
      art.isRead = true;
      writeJSON(ITEMS_FILE, items);
      break;
    }

    default:
      log('Unknown articles subcommand.');
  }
}

function printHelp(command?: string, sub?: string) {
  const help: Record<string, HelpEntry> = {
    root: `Usage: rss.ts <command> [subcommand] [options]

Commands:
  feeds     Manage RSS/Atom feeds
  read      Fetch updates from feeds
  articles  Search and read articles`,
    feeds: {
      _default: `Usage: rss.ts feeds <subcommand> [options]

Subcommands:
  add       --name <name> --url <url> [--description <desc>]
  list      List all feeds
  remove    --name <name> | --url <url> | --id <id>
  import    --url <opml-url> | --filename <opml-file>
  export    --filename <output-file> (defaults to feeds-export-<timestamp>.opml)
  read      Alias for top-level read command`,
    },
    read: `Usage: rss.ts read [--name <feed-name>]

Options:
  --name    Only fetch updates for a specific feed`,
    articles: {
      _default: `Usage: rss.ts articles <subcommand> [options]

Subcommands:
  list      [--recentK <n>] [--all] [--feed <id/name>]
  search    --query <term>
  read      --id <id>`,
    }
  };

  if (!command) {
    log(help.root as string);
  } else if (command === 'read') {
    log(help.read as string);
  } else if (help[command]) {
    const cmdHelp = help[command];
    if (typeof cmdHelp === 'string') {
      log(cmdHelp);
    } else {
      log(sub && cmdHelp[sub] ? cmdHelp[sub] : cmdHelp._default);
    }
  }
}

// --- Main ---

async function main() {
  ensureDirs();

  const { values, positionals } = parseArgs({
    options: {
      name: { type: 'string' },
      url: { type: 'string' },
      description: { type: 'string' },
      id: { type: 'string' },
      filename: { type: 'string' },
      recentK: { type: 'string' },
      all: { type: 'boolean' },
      query: { type: 'string' },
      feed: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true
  });

  const command = positionals[0];
  const subArgs = positionals.slice(1);

  if (values.help || !command) {
    printHelp(command, subArgs[0]);
    return;
  }

  try {
    if (command === 'feeds') await cmdFeeds(subArgs, { values });
    else if (command === 'read') await cmdRead({ values });
    else if (command === 'articles') await cmdArticles(subArgs, { values });
    else printHelp();
  } catch (err: unknown) {
    log(`Error: ${getErrorMessage(err)}`);
    process.exit(1);
  }
}

main();
