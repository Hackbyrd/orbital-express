# Contributing to Orbital Express

## Versioning

Orbital Express and `create-orbital-app` use **synchronized versioning** — they share the same version number.

| Package | npm name | Version |
|---|---|---|
| `orbital-express` | (template, not published) | e.g. `1.2.0` |
| `orbital-express/mcp` | `orbital-express-mcp` | same `1.2.0` |
| `create-orbital-app` | `create-orbital-app` | same `1.2.0` |

### How to release a new version

1. Make your changes in `orbital-express`
2. Bump the version in **all three places** at once:
   - `orbital-express/package.json`
   - `orbital-express/mcp/package.json`
   - `create-orbital-app/package.json`
3. Commit: `git commit -m "chore: release v1.2.0"`
4. Tag: `git tag v1.2.0`
5. Push: `git push && git push --tags`
6. Publish MCP server: `cd mcp && npm publish`
7. Publish CLI: `cd ../create-orbital-app && npm publish`

GitHub Actions will deploy the docs site automatically on push to `main`.

## Development setup

```bash
git clone https://github.com/orbital-express/orbital-express.git
cd orbital-express
yarn install
cp config/.env.template config/.env.development
# fill in DATABASE_URL, REDIS_URL, JWT secrets
yarn migrate
yarn s
```

## Making changes

### Adding or updating a skill
Edit `.claude/skills/<name>/SKILL.md` then re-run the MCP bundle:
```bash
cd mcp && node scripts/bundle-content.js
```

### Adding or updating docs
Edit the relevant page in `docs/` then verify the site builds:
```bash
cd docs && npm run docs:build
```

### Changing framework conventions
If you change a convention, update **all surfaces** that document it:
- `docs/` (the relevant page)
- `docs/reference/conventions.md`
- `docs/conventions.txt`
- `AGENTS.md`
- The relevant `.claude/skills/*/SKILL.md`

The `sync-docs` skill in `.claude/skills/sync-docs/SKILL.md` walks through this.

## Pull request guidelines

- One concern per PR — don't mix convention changes with new features
- Include a test if changing framework behaviour
- Run `yarn test` before opening a PR (needs Postgres + Redis)
- Update the relevant docs + skills if your change affects conventions

## Reporting bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug-report.md) template.

## Requesting features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature-request.md) template.
