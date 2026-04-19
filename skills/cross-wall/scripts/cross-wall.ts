// scripts/cross-wall.ts
/* eslint-disable no-console */
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform, arch } from 'node:os';
import { execSync, spawn } from 'node:child_process';
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  assets: GitHubAsset[];
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const skillRoot = resolve(__dirname, '..');
const assetsDir = join(skillRoot, 'assets');
const configPath = join(skillRoot, '.config.json');
const pidPath = join(skillRoot, '.xray.pid');

const isWindows = platform() === 'win32';
const xrayBinName = isWindows ? 'xray.exe' : 'xray';
const xrayBinPath = join(assetsDir, xrayBinName);

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          if (res.headers.location) {
            downloadFile(res.headers.location, dest).then(resolvePromise).catch(reject);
            return;
          }
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download: ${res.statusCode} ${res.statusMessage}`));
          return;
        }
        const fileData: Buffer[] = [];
        res.on('data', (chunk) => fileData.push(chunk));
        res.on('end', () => {
          writeFileSync(dest, Buffer.concat(fileData));
          resolvePromise();
        });
      })
      .on('error', reject);
  });
}

function extractZip(zipPath: string, destDir: string) {
  if (isWindows) {
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`);
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`);
  }
}

// -----------------------------------------------------------------------------
// Subcommands
// -----------------------------------------------------------------------------

function isXrayUsable(): boolean {
  if (!existsSync(xrayBinPath)) return false;
  try {
    const output = execSync(`"${xrayBinPath}" version`, { encoding: 'utf-8' });
    return output.includes('Xray');
  } catch {
    return false;
  }
}

async function cmdSetup(args: string[]) {
  const defaultVersion = 'v26.3.27';
  const force = args.includes('--force');
  const yes = args.includes('-y') || args.includes('--yes');
  
  // Find version from --version flag or positional arg
  let version: string;
  const versionIdx = args.findIndex(a => a === '--version');
  if (versionIdx !== -1 && args[versionIdx + 1]) {
    version = args[versionIdx + 1];
  } else {
    // Positional arg is the one that is not a flag and not the value of --version
    const positionalArgs = args.filter((a, i) => {
      if (a.startsWith('-')) return false;
      if (i > 0 && args[i - 1] === '--version') return false;
      return true;
    });
    version = positionalArgs[0] || '';
  }

  if (isXrayUsable() && !force) {
    console.log('>> [Setup] Xray binary is already installed and usable.');
    console.log('>> To reinstall or update, use: setup --force');
    process.exit(0);
  }

  // Determine if we should enter interactive mode
  if (!version && !yes) {
    const readline = await import('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n>> Xray-core 版本选择:`);
    console.log(`1. 默认稳定版 (${defaultVersion})`);
    console.log(`2. 最新版本 (latest)`);
    console.log(`3. 手动输入版本号 (例如 v26.3.27)`);
    
    version = await new Promise<string>((resolvePromise) => {
      rl.question('请选择 (1/2/3): ', (answer) => {
        if (answer === '1' || answer === '') {
          resolvePromise(defaultVersion);
        } else if (answer === '2') {
          resolvePromise('latest');
        } else if (answer === '3') {
          rl.question('请输入版本号 (需带 v 前缀): ', (v) => resolvePromise(v.trim()));
        } else {
          console.log(`>> 无效输入，使用默认值 ${defaultVersion}`);
          resolvePromise(defaultVersion);
        }
      });
    });
    rl.close();
  } else if (!version) {
    // If not interactive and no version specified, use default
    version = defaultVersion;
  }

  // Basic normalization for version (prefix with v if missing and looks like x.y.z)
  if (version !== 'latest' && /^\d+\.\d+\.\d+$/.test(version)) {
    version = `v${version}`;
  }

  console.log(`>> [Setup] Initializing cross-wall environment (Xray version: ${version})...`);
  
  // Cleanup old assets before setup
  if (existsSync(assetsDir)) {
    console.log('>> Cleaning up old assets...');
    rmSync(assetsDir, { recursive: true, force: true });
  }
  mkdirSync(assetsDir, { recursive: true });

  const p = platform();
  const a = arch();
  let assetName = '';

  if (p === 'win32') {
    assetName = a === 'x64' ? 'Xray-windows-64.zip' : 'Xray-windows-arm64-v8a.zip';
  } else if (p === 'linux') {
    assetName = a === 'x64' ? 'Xray-linux-64.zip' : 'Xray-linux-arm64-v8a.zip';
  } else if (p === 'darwin') {
    assetName = a === 'x64' ? 'Xray-macos-64.zip' : 'Xray-macos-arm64-v8a.zip';
  } else {
    console.error(`>> Unsupported platform: ${p}/${a}`);
    process.exit(1);
  }

  try {
    const isLatest = version === 'latest';
    const apiUrl = isLatest 
      ? 'https://api.github.com/repos/XTLS/Xray-core/releases/latest'
      : `https://api.github.com/repos/XTLS/Xray-core/releases/tags/${version}`;

    console.log(`>> Fetching Xray-core ${version} release info...`);
    const releaseData = await new Promise<GitHubRelease>((resolvePromise, reject) => {
      https
        .get(apiUrl, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              reject(new Error(`Failed to fetch release info: ${res.statusCode} ${data}`));
              return;
            }
            resolvePromise(JSON.parse(data));
          });
        })
        .on('error', reject);
    });

    const asset = releaseData.assets?.find((ast: GitHubAsset) => ast.name === assetName);
    if (!asset) throw new Error(`Asset ${assetName} not found in release ${version}.`);

    console.log(`>> Downloading ${assetName} from ${asset.browser_download_url} ...`);
    const zipPath = join(assetsDir, assetName);
    await downloadFile(asset.browser_download_url, zipPath);

    console.log(`>> Extracting...`);
    extractZip(zipPath, assetsDir);
    
    // Cleanup downloaded zip after extraction
    console.log('>> Cleaning up temporary installation files...');
    rmSync(zipPath);

    if (!isWindows) {
      execSync(`chmod +x "${xrayBinPath}"`);
    }

    const configExists = existsSync(configPath);
    if (!configExists) {
      writeFileSync(configPath, JSON.stringify({}, null, 2));
      console.log(`>> Created empty config at ${configPath}`);
    }

    console.log('\n=========================================');
    console.log(`[AGENT GUIDANCE] 环境初始化完毕 (${version})。`);
    if (configExists) {
      console.log('检测到已存在 `.config.json`，将默认视其为合法可用配置，可直接执行 `start`。');
    } else {
      console.log('当前代理配置为空。请根据部署需求执行以下操作：');
      console.log('1. 配置客户端 (Client)：请先阅读 `references/document/level-0/ch08-xray-clients.md`');
      console.log('2. 配置服务端 (Server)：请先阅读 `references/document/level-0/ch07-xray-server.md`');
      console.log('完成后，通过参考 `references/examples/` 中的案例，使用 `config` 命令进行按需配置。');
    }
    console.log('=========================================');
  } catch (err: unknown) {
    console.error(`>> [Setup Failed] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

function cmdConfig(args: string[]) {
  if (args.length < 1 || !args[0].includes('=')) {
    console.error('>> Usage: config <path.to.key>=<value>');
    process.exit(1);
  }

  const [pathStr, valStr] = args[0].split('=', 2);
  let finalValue: string | number | boolean | string[] = valStr;

  // Type inference
  if (valStr === 'true') finalValue = true;
  else if (valStr === 'false') finalValue = false;
  else if (!isNaN(Number(valStr))) finalValue = Number(valStr);
  else if (valStr.includes(',')) finalValue = valStr.split(',').map((s) => s.trim());

  if (!existsSync(configPath)) writeFileSync(configPath, '{}');
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));

  const keys = pathStr.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!current[k]) current[k] = isNaN(Number(keys[i + 1])) ? {} : [];
    current = current[k];
  }
  
  current[keys[keys.length - 1]] = finalValue;
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`>> Updated configuration: ${pathStr} =`, finalValue);
  
  console.log('\n=========================================');
  console.log('[AGENT GUIDANCE] 配置已更新！如果配置已完善，即可通过 `start` 命令拉起代理进行验证。');
  console.log('=========================================');
}

function checkRunningPid(): number | null {
  if (!existsSync(pidPath)) return null;
  const pid = parseInt(readFileSync(pidPath, 'utf-8'), 10);
  try {
    process.kill(pid, 0); // test signal, doesn't actually kill
    return pid;
  } catch {
    // Process doesn't exist
    rmSync(pidPath);
    return null;
  }
}

/**
 * Pure Node.js SOCKS5 connectivity probe.
 * Performs the SOCKS5 handshake (RFC 1928) via net.Socket to verify
 * that the proxy can successfully CONNECT to the target host.
 * No external CLI tools (curl, wget) required.
 */
function probeSocks5(proxyPort: number, targetHost: string, targetPort: number, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.on('timeout', () => { socket.destroy(); reject(new Error('SOCKS5 handshake timed out')); });
    socket.on('error', (err) => { socket.destroy(); reject(err); });

    socket.connect(proxyPort, '127.0.0.1', () => {
      // Step 1: Greeting — version 5, 1 auth method (0x00 = no auth)
      socket.write(Buffer.from([0x05, 0x01, 0x00]));
    });

    let phase: 'greeting' | 'connect' = 'greeting';

    socket.on('data', (data: Buffer) => {
      if (phase === 'greeting') {
        // Expect [0x05, 0x00]
        if (data.length < 2 || data[0] !== 0x05 || data[1] !== 0x00) {
          socket.destroy();
          reject(new Error(`SOCKS5 greeting rejected (${data.toString('hex')})`));
          return;
        }
        // Step 2: CONNECT request — domain name addressing (ATYP 0x03)
        const hostBuf = Buffer.from(targetHost, 'utf-8');
        const req = Buffer.alloc(4 + 1 + hostBuf.length + 2);
        req[0] = 0x05; // VER
        req[1] = 0x01; // CMD: CONNECT
        req[2] = 0x00; // RSV
        req[3] = 0x03; // ATYP: DOMAINNAME
        req[4] = hostBuf.length;
        hostBuf.copy(req, 5);
        req.writeUInt16BE(targetPort, 5 + hostBuf.length);
        socket.write(req);
        phase = 'connect';
      } else {
        // Expect reply[1] === 0x00 (succeeded)
        socket.destroy();
        if (data.length >= 2 && data[1] === 0x00) {
          resolve();
        } else {
          reject(new Error(`SOCKS5 CONNECT failed (REP=0x${data.length >= 2 ? data[1].toString(16) : '??'})`));
        }
      }
    });
  });
}

/**
 * Pure Node.js HTTP CONNECT proxy probe.
 * Sends an HTTP CONNECT request to verify the proxy tunnel works.
 */
function probeHttpProxy(proxyPort: number, targetHost: string, targetPort: number, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: proxyPort,
      method: 'CONNECT',
      path: `${targetHost}:${targetPort}`,
      timeout: timeoutMs,
    });

    req.on('connect', (res, socket) => {
      socket.destroy();
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`HTTP CONNECT returned ${res.statusCode}`));
      }
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('HTTP CONNECT timed out')); });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function testConnection(): Promise<boolean> {
  let proxyScheme = '';
  let proxyPort = 0;

  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (Array.isArray(config.inbounds) && config.inbounds.length > 0) {
        const firstInbound = config.inbounds[0];
        if (firstInbound.port) {
          proxyPort = Number(firstInbound.port);
        }
        if (firstInbound.protocol) {
          const proto = firstInbound.protocol.toLowerCase();
          if (proto.includes('socks') || proto.includes('mixed')) {
            proxyScheme = 'socks5';
          } else if (proto.includes('http')) {
            proxyScheme = 'http';
          }
        }
      }
    } catch {
      console.log('>> Connection Test: SKIP (Invalid config file format)');
      return false;
    }
  }

  if (!proxyScheme || !proxyPort) {
    console.log('>> Connection Test: SKIP (No valid inbound configuration found in .config.json)');
    return false;
  }

  const proxyUrl = `${proxyScheme}://127.0.0.1:${proxyPort}`;
  console.log(`>> Testing connectivity via ${proxyUrl} to google.com...`);
  try {
    if (proxyScheme === 'socks5') {
      await probeSocks5(proxyPort, 'www.google.com', 443);
    } else {
      await probeHttpProxy(proxyPort, 'www.google.com', 443);
    }
    console.log('>> Connection Test: SUCCESS');
    return true;
  } catch (e) {
    console.log(`>> Connection Test: FAILED (${(e as Error).message})`);
    return false;
  }
}

async function cmdStart() {
  if (!existsSync(xrayBinPath)) {
    console.error('>> Xray binary not found. Run `setup` first.');
    process.exit(1);
  }
  if (!existsSync(configPath)) {
    console.error('>> Config file not found. Run `setup` first.');
    process.exit(1);
  }

  const existingPid = checkRunningPid();
  if (existingPid) {
    console.log(`>> Xray is already running with PID ${existingPid}.`);
  } else {
    console.log('>> Starting Xray background process...');
    const child = spawn(xrayBinPath, ['run', '-c', configPath], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'] 
    });
    
    child.unref();
    if (child.pid) {
      writeFileSync(pidPath, child.pid.toString());
      console.log(`>> Started Xray (PID: ${child.pid}). Waiting 2s for initialization...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const success = await testConnection();

  console.log('\n=========================================');
  if (success) {
    console.log('[AGENT GUIDANCE] 翻墙链条畅通！你可以继续执行因网络受阻而挂起的核心业务了！');
  } else {
    console.log('[AGENT GUIDANCE] 连通性测试失败！请检查 `.config.json` 节点状态或查看日志排错。');
  }
  console.log('=========================================');
}

function cmdStop() {
  const pid = checkRunningPid();
  if (pid) {
    try {
      process.kill(pid, 9); // SIGKILL
      console.log(`>> Killed Xray process ${pid}.`);
    } catch {
      console.log(`>> Could not kill PID ${pid}.`);
    }
    rmSync(pidPath);
  } else {
    console.log('>> Xray is not currently running.');
  }

  console.log('\n=========================================');
  console.log('[AGENT GUIDANCE] 代理已完全中止并清理。网络环境已恢复原始状态。');
  console.log('=========================================');
}

async function cmdStatus() {
  const pid = checkRunningPid();
  console.log(`>> Status: ${pid ? `Running (PID: ${pid})` : 'Stopped'}`);
  
  if (pid) {
    await testConnection();
  }

  console.log('\n=========================================');
  console.log('[AGENT GUIDANCE] 这是当前网络代理的状态与连通性反馈。可据此决定下一步操作。');
  console.log('=========================================');
}

// -----------------------------------------------------------------------------
// Entry Point
// -----------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || '';

  switch (cmd) {
    case 'setup':
      await cmdSetup(args.slice(1));
      break;
    case 'config':
      cmdConfig(args.slice(1));
      break;
    case 'start':
      await cmdStart();
      break;
    case 'stop':
      cmdStop();
      break;
    case 'status':
      await cmdStatus();
      break;
    default:
      console.error('>> Usage: pnpm exec tsx cross-wall.ts <setup|config|start|stop|status>');
      process.exit(1);
  }
}

main();
