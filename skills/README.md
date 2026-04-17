# Skills 目录

此目录用于存放智能体技能 (Agent Skills)。

每个技能是一个独立的目录，包含：

- `SKILL.md` - 必需文件，包含 YAML frontmatter 和技能指令
- `scripts/` - 可选，包含可执行代码
- `references/` - 可选，包含额外文档
- `assets/` - 可选，包含静态资源

## 技能命名规范

- 名称仅包含小写字母 (a-z)、数字 (0-9) 和连字符 (-)
- 不能以连字符开头或结尾
- 不能包含连续连字符 (--)
- 目录名必须与 SKILL.md 中的 name 字段匹配

## 创建新技能

参考 [AGENTS.md](../AGENTS.md) 中的规范创建新的 skill 目录。