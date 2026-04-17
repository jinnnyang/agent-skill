import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { registerSkill, getSkills } from './index.js';

// 示例：注册示例 skill
registerSkill({
  name: 'hello-world',
  description: '一个简单的示例技能',
});

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
