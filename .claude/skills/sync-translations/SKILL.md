---
name: sync-translations
description: >
  Sync Traditional Chinese (zh-TW) translations after English docs are updated.
  Use this skill whenever English documentation pages have been edited and the
  Chinese versions need to be updated to match. Trigger when the user says things
  like "sync the translations", "update the Chinese docs", "translate the changes",
  "keep Chinese in sync", "update zh-TW", or after any doc editing session where
  English pages changed.
---

# sync-translations Skill

Detect which English docs changed and retranslate only those pages into `docs/zh-TW/`.

## Step 1 — Find changed English doc files

Run this to find which English docs have changed since the last commit (or since a specific commit):

```bash
git diff --name-only HEAD docs/ | grep -v "^docs/zh-TW" | grep "\.md$"
```

If the user specifies a range (e.g. "since last release" or a commit SHA), use:
```bash
git diff --name-only <sha> HEAD docs/ | grep -v "^docs/zh-TW" | grep "\.md$"
```

If no files show up in git diff but the user says specific pages were changed, ask them which files or check `git log --oneline docs/ -10` to find recent changes.

## Step 2 — Show the user what will be retranslated

Before translating, list the files you found and confirm:

> These English pages changed and need their zh-TW versions updated:
> - `docs/guide/getting-started.md` → `docs/zh-TW/guide/getting-started.md`
> - `docs/philosophy/the-origin.md` → `docs/zh-TW/philosophy/the-origin.md`
>
> Retranslating now…

If the list is empty, tell the user no English doc changes were detected.

## Step 3 — Retranslate each changed file

For each changed English file, translate it into Traditional Chinese and overwrite the corresponding `docs/zh-TW/` file.

**Path mapping:** `docs/X/Y.md` → `docs/zh-TW/X/Y.md`

**Translation rules (apply consistently):**
- Translate all prose naturally into Traditional Chinese (Taiwan, 繁體中文)
- Keep ALL code blocks, CLI commands, file paths, variable names, function names in English
- Keep technical terms in English that are standard in Taiwan's tech industry: API, middleware, framework, backend, frontend, Redis, Socket.IO, TypeScript, Vue.js, React, Express.js, Node.js, PostgreSQL, Bull, Joi, Sequelize, Jest, Passport.js, Moment.js, JWT, token, session, OAuth, cron, migration, fixture, schema, UUID, action, controller, model, route, queue
- Keep product/brand names in English: Orbital Express, FiscalNote, Nitra, Heroku, Render, AWS, GitHub, LinkedIn, npm, yarn
- Preserve all VitePress markdown: `::: tip/warning/danger/info` blocks, tables, headers, code blocks
- Update internal links: `/guide/X` → `/zh-TW/guide/X`, `/philosophy/X` → `/zh-TW/philosophy/X`, etc.
- Leave external links unchanged
- Tone: direct and confident, matching the English original

## Step 4 — Commit the updated translations

After all files are written:

```bash
git add docs/zh-TW/
git commit -m "docs(zh-TW): sync translations for updated English pages"
git push origin main
```

## Notes

- Only retranslate files that actually changed — don't touch zh-TW files whose English source is unchanged.
- If a new English page was added that has no zh-TW counterpart yet, create it.
- If an English page was deleted, delete the corresponding zh-TW file.
- The sidebar in `docs/.vitepress/config.mjs` only needs updating if a new page was added or a page was removed — not for content-only changes.
