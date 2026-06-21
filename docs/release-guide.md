# Release Guide

How to cut a new version of Orbital Express.

---

## Versioning Rules

Orbital Express follows [Semantic Versioning](https://semver.org/). The version number is `MAJOR.MINOR.PATCH`:

| Change type | Which number bumps | Example |
|---|---|---|
| Bug fix, doc correction, small tweak | Patch | `3.0.0` → `3.0.1` |
| New feature, non-breaking addition | Minor | `3.0.1` → `3.1.0` |
| Breaking change or full rewrite | Major | `3.1.0` → `4.0.0` |

**When in doubt:** if existing projects using Orbital Express would need to change their code to adopt this update, it's a breaking change → bump major.

---

## Step-by-Step Release Process

### 1. Make your changes

Commit everything to `main` as normal. The version number doesn't change until you're ready to cut a release.

### 2. Update `CHANGELOG.md`

Open `CHANGELOG.md` at the repo root. Copy the template block from the bottom of the file and paste it **above** the previous release entry. Fill it in:

```md
## [3.0.1] — 2026-07-15

### Overview
One sentence describing what this release is about.

### Added
- Something new that didn't exist before

### Changed
- Something that existed but behaves differently now

### Fixed
- Bug that was broken and is now fixed

### Removed
- Something that no longer exists

### ⚠ Breaking Changes
- Anything that requires consumers to update their code
```

Only include sections that are relevant — skip empty ones.

### 3. Update `docs/changelog.md`

Open `docs/changelog.md` and add the same entry at the top (below the intro paragraph). You can omit the template comment block — just the content.

::: tip Keep them in sync
`CHANGELOG.md` (repo root) is the source of truth. `docs/changelog.md` is what users see on the docs site. They should always match.
:::

### 4. Bump the version in `package.json`

```json
{
  "version": "3.0.1"
}
```

### 5. Commit the release

```bash
git add CHANGELOG.md docs/changelog.md package.json
git commit -m "chore: release v3.0.1"
git push origin main
```

### 6. Tag and push the tag

```bash
git tag v3.0.1
git push origin v3.0.1
```

That's it. The [release workflow](https://github.com/Hackbyrd/orbital-express/actions/workflows/release.yml) triggers automatically, reads your changelog entry, and creates a GitHub Release.

---

## What the automation does

When a `v*` tag is pushed, `.github/workflows/release.yml`:

1. Checks out the repo
2. Extracts the changelog section matching the tag version from `CHANGELOG.md`
3. Creates a GitHub Release at `github.com/Hackbyrd/orbital-express/releases` with that text as the release notes

You don't need to write anything on GitHub — just the changelog file.

---

## Marking breaking changes

Add a `### ⚠ Breaking Changes` section to the changelog entry and describe exactly what needs to change on the consumer side:

```md
### ⚠ Breaking Changes
- `middleware/auth.js` no longer exports `attachAuth` — replace with `attachJWTAuth`
- The `req.user.role` field has been removed — use `req.user.userType` instead
```

Breaking changes warrant a **major** version bump.

---

## Quick reference

```bash
# Patch release (bug fix / small tweak)
# 1. Edit CHANGELOG.md + docs/changelog.md + package.json
git add CHANGELOG.md docs/changelog.md package.json
git commit -m "chore: release v3.0.1"
git push origin main
git tag v3.0.1 && git push origin v3.0.1

# Minor release (new feature)
git tag v3.1.0 && git push origin v3.1.0

# Major release (breaking change / rewrite)
git tag v4.0.0 && git push origin v4.0.0
```
