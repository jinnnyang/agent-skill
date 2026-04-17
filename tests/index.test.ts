import { expect, test, describe, beforeEach } from 'vitest';
import { registerSkill, getSkills, findSkill, resetSkills } from '../src/index';

describe('Skill Manager', () => {
  beforeEach(() => {
    resetSkills();
  });

  test('registerSkill should add a skill', () => {
    registerSkill({ name: 'test-skill', description: 'test' });
    expect(getSkills().length).toBe(1);
    expect(getSkills()[0].name).toBe('test-skill');
  });

  test('findSkill should find existing skill', () => {
    registerSkill({ name: 'test-skill', description: 'test' });
    const skill = findSkill('test-skill');
    expect(skill).toBeDefined();
    expect(skill?.name).toBe('test-skill');
  });

  test('findSkill should return undefined for non-existing skill', () => {
    const skill = findSkill('not-exist');
    expect(skill).toBeUndefined();
  });

  test('getSkills should return all registered skills', () => {
    registerSkill({ name: 'skill-1', description: 'desc' });
    registerSkill({ name: 'skill-2', description: 'desc' });
    expect(getSkills().length).toBe(2);
  });
});
