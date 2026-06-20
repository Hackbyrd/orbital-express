#!/usr/bin/env node

/**
 * Runs before `npm publish` (via the `prepare` script).
 * Reads all skills and docs from the orbital-express repo and writes them
 * into mcp/content/ as JSON so the published package is self-contained.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const OUT = path.join(__dirname, '../content');

fs.mkdirSync(OUT, { recursive: true });

// ─── BUNDLE SKILLS ────────────────────────────────────────────────────────

const skillsDir = path.join(ROOT, '.claude/skills');
const skills = {};

for (const name of fs.readdirSync(skillsDir)) {
  const skillFile = path.join(skillsDir, name, 'SKILL.md');
  if (!fs.existsSync(skillFile)) continue;

  const raw = fs.readFileSync(skillFile, 'utf8');

  // Parse frontmatter (---\nkey: value\n---\ncontent)
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let description = '';
  let content = raw;

  if (fmMatch) {
    const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
    description = descMatch ? descMatch[1].trim() : '';
    content = fmMatch[2].trim();
  }

  skills[name] = { name, description, content };
}

fs.writeFileSync(path.join(OUT, 'skills.json'), JSON.stringify(skills, null, 2));
console.log(`Bundled ${Object.keys(skills).length} skills`);

// ─── BUNDLE DOCS ──────────────────────────────────────────────────────────

const docsDir = path.join(ROOT, 'docs');
const docs = {};

// Sections to include (skip node_modules, public, .vitepress)
const INCLUDE_DIRS = [
  'guide', 'core', 'auth', 'background-jobs',
  'realtime', 'testing', 'i18n', 'database',
  'generator', 'reference', 'tutorials',
];

for (const section of INCLUDE_DIRS) {
  const sectionDir = path.join(docsDir, section);
  if (!fs.existsSync(sectionDir)) continue;

  for (const file of fs.readdirSync(sectionDir)) {
    if (!file.endsWith('.md')) continue;
    const slug = `${section}/${file.replace('.md', '')}`;
    const content = fs.readFileSync(path.join(sectionDir, file), 'utf8');
    // Extract title from first # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    docs[slug] = {
      slug,
      title: titleMatch ? titleMatch[1].trim() : slug,
      content,
    };
  }
}

fs.writeFileSync(path.join(OUT, 'docs.json'), JSON.stringify(docs, null, 2));
console.log(`Bundled ${Object.keys(docs).length} doc pages`);

// ─── BUNDLE CONVENTIONS ───────────────────────────────────────────────────

const conventionsPath = path.join(ROOT, 'docs/conventions.txt');
if (fs.existsSync(conventionsPath)) {
  fs.copyFileSync(conventionsPath, path.join(OUT, 'conventions.txt'));
  console.log('Bundled conventions.txt');
}

// ─── BUNDLE AGENTS.MD ─────────────────────────────────────────────────────

const agentsPath = path.join(ROOT, 'AGENTS.md');
if (fs.existsSync(agentsPath)) {
  fs.copyFileSync(agentsPath, path.join(OUT, 'AGENTS.md'));
  console.log('Bundled AGENTS.md');
}

console.log('\nContent bundled to mcp/content/ — ready to publish.');
