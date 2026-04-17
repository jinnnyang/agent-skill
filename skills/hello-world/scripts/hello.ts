// scripts/hello.ts
// 演示：使用 Node.js 系统 API 采集真实环境信息，格式化输出

import os from 'node:os';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

function main() {
  // ---- 实际程序逻辑：采集系统信息 ----
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpuCount = os.cpus().length;
  const cpuModel = os.cpus()[0]?.model?.trim() ?? 'Unknown';
  const totalMemGB = (os.totalmem() / 1024 ** 3).toFixed(1);
  const freeMemGB = (os.freemem() / 1024 ** 3).toFixed(1);
  const uptime = formatUptime(os.uptime());
  const nodeVersion = process.version;
  const now = new Date().toLocaleString();

  // ---- 格式化输出 ----
  console.log(`>> Hello from ${hostname}!`);
  console.log(`>> Time: ${now}`);
  console.log(`>> System: ${platform}/${arch} | Node ${nodeVersion}`);
  console.log(`>> CPU: ${cpuModel} (${cpuCount} cores)`);
  console.log(`>> Memory: ${freeMemGB} GB free / ${totalMemGB} GB total`);
  console.log(`>> Uptime: ${uptime}`);

  // ---- 连续提示：末尾追加，仅 **少量** 引导 ----
  console.log("=========================================");
  console.log(
    '\n[AGENT GUIDANCE] 用户处于交互初始阶段，可询问是否需要天气(weather)或新闻(news)。'
  );
  console.log("=========================================");
}

main();
