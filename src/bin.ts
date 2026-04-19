import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { loadSkills, getSkills } from './index.js';

// 获取 skills 目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(__dirname, '../skills');

// 动态加载 skills 目录下的所有技能
loadSkills(skillsDir);

// 主函数
export function main(): void {
  console.log('Agent Skill 仓库已初始化');
  console.log(`已加载 ${getSkills().length} 个技能:`);

  for (const skill of getSkills()) {
    console.log(`  - ${skill.name}: ${skill.description}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
