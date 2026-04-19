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

// --- Commands ---

async function cmdSync(options: ParsedOptions) {
  const feeds = readJSON<Feed[]>(FEEDS_FILE, []);
  if (feeds.length === 0) {
    log('No feeds subscribed yet.');
    guidance('Use `add <url>` to subscribe to your first feed.');
    return;
  }

  const items = readJSON<Article[]>(ITEMS_FILE, []);
  const targetName = options.values.name || options.values.feed;
  
  const toProcess = targetName ? feeds.filter(f => f.name === targetName || f.id === targetName) : feeds;
  log(`📡 Syncing ${toProcess.length} feeds...`);

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
      log(`❌ Error fetching ${feed.name}: ${getErrorMessage(err)}`);
    }
  }));

  // Archiving logic
  if (items.length > MAX_ITEMS) {
    items.sort((a, b) => b.publishedDate - a.publishedDate);
    const toArchive = items.splice(ARCHIVE_COUNT);
    const archivePath = path.join(ARCHIVE_DIR, `${Date.now()}.json`);
    writeJSON(archivePath, toArchive);
    log(`📦 Archived ${toArchive.length} old items to ${archivePath}`);
  }

  writeJSON(ITEMS_FILE, items);
  log(`✨ Done. Found ${newCount} new articles.`);
  
  if (newCount > 0) {
    guidance('Latest updates arrived. Run `ls` to see the new articles or `search <term>` to find specific topics.');
  } else {
    guidance('No new updates. You can browse existing content with `ls` or search with `search <term>`.');
  }
}

async function cmdList(options: ParsedOptions) {
  const items = readJSON<Article[]>(ITEMS_FILE, []);
  if (items.length === 0) {
    log('Your inbox is empty.');
    guidance('Run `sync` to fetch updates from your feeds.');
    return;
  }

  const limit = options.values.recentK ? parseInt(options.values.recentK) : 15;
  const feedFilter = options.values.feed;
  const list = items
    .filter(i => (options.values.all ? true : !i.isRead))
    .filter(i => feedFilter ? (i.feedId === feedFilter || i.id === feedFilter) : true)
    .sort((a, b) => b.publishedDate - a.publishedDate)
    .slice(0, limit);
  
  if (list.length === 0) {
    log('No unread articles found.');
    guidance('Use `ls --all` to see everything or `sync` to fetch new content.');
    return;
  }

  log(`📋 Latest ${options.values.all ? '' : 'Unread '}Articles:`);
  log('| ID (Short) | Date | Title | Feed |');
  log('| :--- | :--- | :--- | :--- |');
  list.forEach(i => log(`| ${i.id.substring(0, 8)} | ${new Date(i.publishedDate).toISOString().split('T')[0]} | ${i.title} | ${i.feedId} |`));
  
  guidance('To read an article, use `read <id>`. To mark all visible as read, use `clean`.');
}

async function cmdSearch(query: string) {
  if (!query) throw new Error('Query required. Usage: search <term>');
  
  const items = readJSON<Article[]>(ITEMS_FILE, []);
  const lowerQuery = query.toLowerCase();
  const results = items.filter(i => 
    i.title.toLowerCase().includes(lowerQuery) || 
    i.description.toLowerCase().includes(lowerQuery) ||
    i.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
    i.keywords.some(k => k.toLowerCase().includes(lowerQuery))
  );

  if (results.length === 0) {
    log(`No results found for "${query}".`);
    guidance('Try a different keyword or run `sync` to ensure your cache is up to date.');
    return;
  }

  log(`🔍 Found ${results.length} results for "${query}":`);
  results.slice(0, 15).forEach(i => {
    const snippet = i.description.replace(/<[^>]+>/g, '').substring(0, 100).trim();
    log(`\n[${i.id.substring(0, 8)}] ${i.title}`);
    log(`   > ${snippet}${snippet.length >= 100 ? '...' : ''}`);
  });

  guidance('Use `read <id>` to see the full content of any article above.');
}

async function cmdReadArticle(id: string) {
  if (!id) throw new Error('Article ID required. Usage: read <id>');
  
  const items = readJSON<Article[]>(ITEMS_FILE, []);
  // Support both full ID and 8-char prefix
  const art = items.find(i => i.id === id || i.id.startsWith(id));
  
  if (!art) {
    log(`❌ Article with ID "${id}" not found.`);
    guidance('Run `ls` to see available IDs or `sync` to fetch new ones.');
    return;
  }

  const fileName = `${art.id}.md`;
  const filePath = path.join(ARTICLES_DIR, fileName);

  if (fs.existsSync(filePath)) {
    log(fs.readFileSync(filePath, 'utf-8'));
  } else {
    log(`📖 Fetching full content from: ${art.url}`);
    try {
      const res = await safeFetch(art.url);
      const html = await res.text();
      const md = htmlToMarkdown(html, art.title, art.url, new Date(art.publishedDate).toISOString());
      
      fs.writeFileSync(filePath, md);
      
      if (md.length > 6000) {
        log(md.slice(0, 6000) + `\n\n[...Content truncated (remaining ${md.length - 6000} chars). Full text saved to: ${filePath}]`);
        guidance(`This article is very long. Use a file viewer (e.g. view_file) to read the full saved version: ${filePath}`);
      } else {
        log(md);
      }
    } catch (err: unknown) {
      log(`❌ Failed to fetch article: ${getErrorMessage(err)}`);
    }
  }

  // Mark as read
  if (!art.isRead) {
    art.isRead = true;
    writeJSON(ITEMS_FILE, items);
  }
}

async function cmdClean() {
  const items = readJSON<Article[]>(ITEMS_FILE, []);
  let count = 0;
  for (const item of items) {
    if (!item.isRead) {
      item.isRead = true;
      count++;
    }
  }
  if (count > 0) {
    writeJSON(ITEMS_FILE, items);
    log(`🧹 Marked ${count} articles as read.`);
  } else {
    log('All articles were already marked as read.');
  }
  guidance('Your inbox is now clean. Use `sync` to fetch new articles or `ls --all` to view your history.');
}

async function cmdAddFeed(url: string, options: ParsedOptions) {
  if (!url) throw new Error('Feed URL required. Usage: add <url> [--name <name>]');
  
  const feeds = readJSON<Feed[]>(FEEDS_FILE, []);
  if (feeds.find(f => f.url === url)) {
    log(`⚠️ Already subscribed to: ${url}`);
    return;
  }

  let finalName = options.values.name;
  let finalDesc = options.values.description || '';
  let finalUrl = url;

  log(`🌐 Probing feed: ${url}...`);

  try {
    const res = await safeFetch(url);
    const content = await res.text();

    // Auto-discovery from HTML if provided URL is a landing page
    if (content.includes('<html') || content.includes('<!DOCTYPE html')) {
      const linkMatch = content.match(/<link[^>]+type="application\/(?:rss\+xml|atom\+xml)"[^>]+href="([^"]+)"/i);
      if (linkMatch?.[1]) {
        finalUrl = new URL(linkMatch[1], url).href;
        log(`✨ Auto-discovered RSS URL: ${finalUrl}`);
        // Fetch the actual XML now
        const resXml = await safeFetch(finalUrl);
        const xml = await resXml.text();
        if (!finalName) finalName = extractTag(xml, 'title');
        if (!finalDesc) finalDesc = extractTag(xml, 'description') || extractTag(xml, 'subtitle');
      }
    } else {
      // It's already XML
      if (!finalName) finalName = extractTag(content, 'title');
      if (!finalDesc) finalDesc = extractTag(content, 'description') || extractTag(content, 'subtitle');
    }
  } catch (err) {
    log(`⚠️ Could not probe feed metadata: ${getErrorMessage(err)}. Using provided info.`);
  }

  const name = finalName || new URL(finalUrl).hostname;
  feeds.push({ id: crypto.randomUUID(), name, url: finalUrl, description: finalDesc });
  writeJSON(FEEDS_FILE, feeds);
  
  log(`✅ Subscribed to: ${name}`);
  guidance(`Excellent. You should now run \`sync\` to pull the latest articles from "${name}".`);
}

async function cmdRemoveFeed(target: string) {
  if (!target) throw new Error('Feed ID, Name or URL required. Usage: rm <target>');
  
  const feeds = readJSON<Feed[]>(FEEDS_FILE, []);
  const initialCount = feeds.length;
  const filtered = feeds.filter(f => f.id !== target && f.name !== target && f.url !== target);
  
  if (filtered.length === initialCount) {
    log(`❌ No feed matching "${target}" found.`);
  } else {
    writeJSON(FEEDS_FILE, filtered);
    log(`🗑️ Removed feed matching: ${target}`);
  }
}

async function cmdShowFeeds() {
  const feeds = readJSON<Feed[]>(FEEDS_FILE, []);
  if (feeds.length === 0) {
    log('No feeds subscribed.');
    guidance('Use `add <url>` to subscribe.');
    return;
  }

  log('📡 Subscribed Feeds:');
  log('| Name | ID | URL |');
  log('| :--- | :--- | :--- |');
  feeds.forEach(f => log(`| ${f.name} | ${f.id.substring(0, 8)} | ${f.url} |`));
  guidance('Manage feeds with `add`, `rm`, `import`, or `export`. Use `sync` to fetch updates.');
}

async function cmdImportExport(sub: 'import' | 'export', target: string, options: ParsedOptions) {
  const feeds = readJSON<Feed[]>(FEEDS_FILE, []);

  if (sub === 'import') {
    if (!target) throw new Error('OPML URL or Filename required. Usage: import <target>');
    let content = '';
    if (target.startsWith('http')) {
      const res = await safeFetch(target);
      content = await res.text();
    } else {
      content = fs.readFileSync(target, 'utf-8');
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
    log(`📥 Imported ${count} new feeds.`);
    guidance('Run `sync` to fetch content for these new subscriptions.');
  } else {
    let opml = '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.0">\n<head><title>RSS Feeds Export</title></head>\n<body>\n';
    feeds.forEach(f => {
      const cleanName = f.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const cleanUrl = f.url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      opml += `  <outline text="${cleanName}" title="${cleanName}" type="rss" xmlUrl="${cleanUrl}"/>\n`;
    });
    opml += '</body>\n</opml>';
    const outFilename = target || options.values.filename || `feeds-export-${Date.now()}.opml`;
    fs.writeFileSync(outFilename, opml, 'utf-8');
    log(`📤 Exported ${feeds.length} feeds to ${outFilename}`);
  }
}

function printHelp() {
  log(`
🚀 RSS Skill - Unified Terminal Feed Reader

Usage: rss.ts <command> [argument] [options]

Core Commands:
  sync              Fetch latest updates from all feeds
  ls, list          List recent unread articles (use --all for everything)
  search <query>    Search keywords in article titles and descriptions
  read <id>         Display full text of an article (supports 8-char ID prefix)
  clean             Mark all current items as read

Feed Management:
  add <url>         Subscribe to a new feed (auto-discovers metadata)
  rm <id|name|url>  Remove/Unsubscribe a feed
  feeds             List all active subscriptions
  import <url|file> Import feeds from an OPML source
  export [file]     Export subscriptions to an OPML file

Options:
  --all             Used with 'ls' to show both read and unread items
  --feed <id|name>  Filter 'ls' or 'sync' by a specific feed
  --recentK <n>     Number of items to show in 'ls' (default: 15)
  --name <name>     Override name when using 'add'
  --help, -h        Show this help message
  `);
}

// --- Main ---

async function main() {
  ensureDirs();

  const { values, positionals } = parseArgs({
    options: {
      name: { type: 'string' },
      url: { type: 'string' }, // deprecated but kept for compat
      description: { type: 'string' },
      id: { type: 'string' }, // deprecated but kept for compat
      filename: { type: 'string' },
      recentK: { type: 'string' },
      all: { type: 'boolean' },
      query: { type: 'string' }, // deprecated but kept for compat
      feed: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true
  });

  const command = positionals[0]?.toLowerCase();
  const arg = positionals[1];

  if (values.help || !command) {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'sync':
        await cmdSync({ values });
        break;
      case 'ls':
      case 'list':
        await cmdList({ values });
        break;
      case 'search':
        await cmdSearch(arg || (values.query as string));
        break;
      case 'read':
        await cmdReadArticle(arg || (values.id as string));
        break;
      case 'clean':
        await cmdClean();
        break;
      case 'add':
      case 'subscribe':
      case 'sub':
        await cmdAddFeed(arg || (values.url as string), { values });
        break;
      case 'rm':
      case 'remove':
      case 'unsubscribe':
      case 'unsub':
        await cmdRemoveFeed(arg || (values.id as string) || (values.name as string));
        break;
      case 'feeds':
      case 'sources':
        await cmdShowFeeds();
        break;
      case 'import':
        await cmdImportExport('import', arg || (values.url as string), { values });
        break;
      case 'export':
        await cmdImportExport('export', arg || (values.filename as string), { values });
        break;
      
      // Backward compatibility for the old nested commands
      case 'articles': {
        const sub = positionals[1];
        if (sub === 'list') await cmdList({ values });
        else if (sub === 'search') await cmdSearch(values.query as string);
        else if (sub === 'read') await cmdReadArticle(values.id as string);
        else throw new Error('Unknown articles subcommand. Use list, search, or read.');
        break;
      }

      default:
        log(`Unknown command: ${command}`);
        printHelp();
    }
  } catch (err: unknown) {
    log(`❌ Error: ${getErrorMessage(err)}`);
    process.exit(1);
  }
}

main();
