import fs from 'node:fs';
import path from 'node:path';

/**
 * Agent Skill - 智能体开发仓库
 * 入口文件
 */

export interface Skill {
  name: string;
  description: string;
  path: string;
}

class SkillManager {
  private skills: Skill[] = [];

  registerSkill(skill: Skill): void {
    this.skills.push(skill);
  }

  getSkills(): Skill[] {
    return [...this.skills];
  }

  findSkill(name: string): Skill | undefined {
    return this.skills.find((s) => s.name === name);
  }

  loadSkillsFromDirectory(skillsDir: string): void {
    if (!fs.existsSync(skillsDir)) return;

    const directories = fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const dirName of directories) {
      const skillPath = path.join(skillsDir, dirName);
      const skillMdPath = path.join(skillPath, 'SKILL.md');

      if (fs.existsSync(skillMdPath)) {
        const content = fs.readFileSync(skillMdPath, 'utf8');
        const skill = this.parseSkillMd(content, skillPath);
        if (skill) {
          this.registerSkill(skill);
        }
      }
    }
  }

  private parseSkillMd(content: string, fullPath: string): Skill | undefined {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (match) {
      const yamlContent = match[1];
      const nameMatch = yamlContent.match(/name:\s*(.+)/);
      const descMatch = yamlContent.match(/description:\s*(.+)/);

      if (nameMatch) {
        return {
          name: nameMatch[1].trim(),
          description: descMatch ? descMatch[1].trim() : '',
          path: fullPath,
        };
      }
    }
    return undefined;
  }

  reset(): void {
    this.skills = [];
  }
}

export const skillManager = new SkillManager();

export function registerSkill(skill: Skill): void {
  skillManager.registerSkill(skill);
}

export function getSkills(): Skill[] {
  return skillManager.getSkills();
}

export function findSkill(name: string): Skill | undefined {
  return skillManager.findSkill(name);
}

export function loadSkills(skillsDir: string): void {
  skillManager.loadSkillsFromDirectory(skillsDir);
}

export function resetSkills(): void {
  skillManager.reset();
}
