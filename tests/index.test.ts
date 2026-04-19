import { expect, test, describe, beforeEach } from 'vitest';
import { registerSkill, getSkills, findSkill, resetSkills } from '../src/index';

describe('Skill Manager', () => {
  beforeEach(() => {
    resetSkills();
  });

  test('registerSkill should add a skill', () => {
    registerSkill({ name: 'test-skill', description: 'test', path: '/test' });
    expect(getSkills().length).toBe(1);
    expect(getSkills()[0].name).toBe('test-skill');
  });

  test('findSkill should find existing skill', () => {
    registerSkill({ name: 'test-skill', description: 'test', path: '/test' });
    const skill = findSkill('test-skill');
    expect(skill).toBeDefined();
    expect(skill?.name).toBe('test-skill');
  });

  test('findSkill should return undefined for non-existing skill', () => {
    const skill = findSkill('not-exist');
    expect(skill).toBeUndefined();
  });

  test('getSkills should return all registered skills', () => {
    registerSkill({ name: 'skill-1', description: 'desc', path: '/1' });
    registerSkill({ name: 'skill-2', description: 'desc', path: '/2' });
    expect(getSkills().length).toBe(2);
  });
});
