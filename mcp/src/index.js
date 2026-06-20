#!/usr/bin/env node

/**
 * Orbital Express MCP Server
 *
 * Gives AI assistants (Claude, etc.) full knowledge of the Orbital Express
 * framework — conventions, skills, and docs — via the Model Context Protocol.
 *
 * Usage (add to .claude/settings.json in any project using Orbital Express):
 *   {
 *     "mcpServers": {
 *       "orbital-express": {
 *         "command": "npx",
 *         "args": ["-y", "orbital-express-mcp"]
 *       }
 *     }
 *   }
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

// ─── LOAD BUNDLED CONTENT ─────────────────────────────────────────────────

const CONTENT = path.join(__dirname, '../content');

function loadJSON(file) {
  const p = path.join(CONTENT, file);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadText(file) {
  const p = path.join(CONTENT, file);
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
}

const skills = loadJSON('skills.json');
const docs = loadJSON('docs.json');
const conventions = loadText('conventions.txt');
const agentsMd = loadText('AGENTS.md');

// ─── SERVER SETUP ─────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'orbital-express',
  version: '1.0.0',
});

// ─── TOOLS ────────────────────────────────────────────────────────────────

/**
 * list_skills — returns all available skills with name + description.
 * Call this first to know what skills exist before calling get_skill.
 */
server.tool(
  'list_skills',
  'List all Orbital Express skills (AI playbooks). Returns each skill name and a one-line description of when to use it.',
  {},
  async () => {
    const list = Object.values(skills).map(s => `- **${s.name}**: ${s.description}`);
    return {
      content: [{
        type: 'text',
        text: `# Orbital Express Skills\n\n${list.join('\n')}`,
      }],
    };
  }
);

/**
 * get_skill — returns the full step-by-step playbook for a specific skill.
 */
server.tool(
  'get_skill',
  'Get the full step-by-step playbook for an Orbital Express skill. Use this before implementing any feature, action, task, migration, etc.',
  { name: z.string().describe('Skill name, e.g. "create-feature", "add-action", "add-migration"') },
  async ({ name }) => {
    const skill = skills[name];
    if (!skill) {
      const available = Object.keys(skills).join(', ');
      return {
        content: [{
          type: 'text',
          text: `Skill "${name}" not found. Available skills: ${available}`,
        }],
        isError: true,
      };
    }
    return {
      content: [{
        type: 'text',
        text: `# Skill: ${skill.name}\n\n${skill.content}`,
      }],
    };
  }
);

/**
 * get_conventions — returns the full Orbital Express conventions rulebook.
 * Call this when you need naming rules, file structure, HTTP conventions, etc.
 */
server.tool(
  'get_conventions',
  'Get the full Orbital Express conventions rulebook — naming, file structure, HTTP rules, error handling, DB patterns, testing rules, etc.',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: `# Orbital Express Conventions\n\n${conventions}`,
      }],
    };
  }
);

/**
 * get_framework_overview — returns the AGENTS.md quick-reference.
 * Best first call when starting work in an Orbital Express project.
 */
server.tool(
  'get_framework_overview',
  'Get a concise overview of the Orbital Express framework — architecture, golden rules, command cheat sheet, and available skills. Best first call when starting work.',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: agentsMd,
      }],
    };
  }
);

/**
 * list_docs — lists all available documentation pages.
 */
server.tool(
  'list_docs',
  'List all available Orbital Express documentation pages with their titles.',
  {},
  async () => {
    const list = Object.values(docs).map(d => `- **${d.slug}**: ${d.title}`);
    return {
      content: [{
        type: 'text',
        text: `# Orbital Express Documentation\n\n${list.join('\n')}`,
      }],
    };
  }
);

/**
 * get_docs_page — returns a specific documentation page by slug.
 */
server.tool(
  'get_docs_page',
  'Get a specific Orbital Express documentation page. Use list_docs first to find the right slug.',
  { slug: z.string().describe('Page slug, e.g. "core/actions", "auth/overview", "testing/patterns"') },
  async ({ slug }) => {
    const page = docs[slug];
    if (!page) {
      const available = Object.keys(docs).join(', ');
      return {
        content: [{
          type: 'text',
          text: `Page "${slug}" not found. Available pages: ${available}`,
        }],
        isError: true,
      };
    }
    return {
      content: [{
        type: 'text',
        text: page.content,
      }],
    };
  }
);

/**
 * search_docs — full-text search across all docs and skills.
 */
server.tool(
  'search_docs',
  'Search across all Orbital Express documentation and skills for a keyword or concept.',
  { query: z.string().describe('Search term, e.g. "paranoid", "refresh token", "queue", "fixture"') },
  async ({ query }) => {
    const q = query.toLowerCase();
    const results = [];

    // Search docs
    for (const page of Object.values(docs)) {
      if (page.content.toLowerCase().includes(q) || page.title.toLowerCase().includes(q)) {
        // Find the surrounding context (first match)
        const lines = page.content.split('\n');
        const matchLine = lines.findIndex(l => l.toLowerCase().includes(q));
        const excerpt = lines.slice(Math.max(0, matchLine - 1), matchLine + 4).join('\n');
        results.push(`**[doc] ${page.slug}** — ${page.title}\n\`\`\`\n${excerpt}\n\`\`\``);
      }
    }

    // Search skills
    for (const skill of Object.values(skills)) {
      if (skill.content.toLowerCase().includes(q) || skill.description.toLowerCase().includes(q)) {
        results.push(`**[skill] ${skill.name}** — ${skill.description}`);
      }
    }

    // Search conventions
    if (conventions.toLowerCase().includes(q)) {
      const lines = conventions.split('\n');
      const matchLine = lines.findIndex(l => l.toLowerCase().includes(q));
      const excerpt = lines.slice(Math.max(0, matchLine - 1), matchLine + 4).join('\n');
      results.push(`**[conventions]**\n\`\`\`\n${excerpt}\n\`\`\``);
    }

    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No results found for "${query}".`,
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: `# Search results for "${query}"\n\n${results.join('\n\n---\n\n')}`,
      }],
    };
  }
);

// ─── START ─────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('MCP server error:', err);
  process.exit(1);
});
