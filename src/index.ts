/**
 * Agent Skill - 智能体开发仓库
 * 入口文件
 */

export interface Skill {
  name: string;
  description: string;
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

export function resetSkills(): void {
  skillManager.reset();
}