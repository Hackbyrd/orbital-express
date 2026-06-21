---
name: release
description: >
  Cut a new release of Orbital Express — bump the version, write the changelog, commit, push, and tag.
  Use this skill whenever the user says something like "let's do a release", "write the changelog",
  "let's ship a new version", "bump the version", "time to tag a release", or anything that suggests
  they want to record changes and publish a new version. Trigger even if the phrasing is casual
  ("hey let's write the changelog", "ready to release", "let's tag this").
---

# Release Skill

Walk the user through cutting a new Orbital Express release from start to finish.
The full process reference is at `docs/release-guide.md`.

## Step 1 — Read the current state

Before asking anything, read:
- `package.json` → get the current version
- `CHANGELOG.md` → see the last release entry so you know what's already logged

## Step 2 — Ask: what kind of release?

Tell the user the current version and suggest the three options with the bumped number for each:

> Current version is **3.0.0**. What kind of release is this?
> - **Patch** `3.0.1` — bug fix, doc correction, small tweak
> - **Minor** `3.1.0` — new feature, non-breaking addition
> - **Major** `4.0.0` — breaking change or full rewrite

Wait for their answer, then confirm the new version number you'll use.

## Step 3 — Collect what changed

Ask the user to describe what changed. Walk through each section one at a time — only ask about sections that might be relevant. You don't need all of them; skip any the user says are empty.

Ask in this order:
1. **Added** — new things that didn't exist before
2. **Changed** — existing things that behave differently
3. **Fixed** — bugs that were broken and are now working
4. **Removed** — things that no longer exist
5. **Breaking Changes** — anything that requires users to update their code (only ask if major or if the user mentioned something breaking)

For each section, let the user describe in their own words — you will clean up and format the bullet points. Keep entries concise: one line per item, lead with the **thing** in bold, follow with a short description after the dash.

**Example of good formatting:**
- **`middleware/exit.js`** — graceful shutdown now waits up to 30s before force-exiting
- **Route URL convention** — all lowercase, no separators (`V1LogoutAll` → `/v1/users/logoutall`)

Also ask for a one-sentence **Overview** that summarizes what this release is about. This goes at the top of the entry.

## Step 4 — Write a summary and confirm

Before touching any files, show the user the full changelog entry you're about to write:

```
## [X.Y.Z] — YYYY-MM-DD

### Overview
…

### Added
- …

### Changed
- …
```

Ask: "Does this look right? I'll write this to CHANGELOG.md and docs/changelog.md, bump package.json to X.Y.Z, commit, push to main, and tag v X.Y.Z."

Wait for confirmation before proceeding.

## Step 5 — Write the files

### CHANGELOG.md
Prepend the new entry **after the intro block** (the lines before the first `## [` heading) and **before** the previous release entry. The structure must be:

```
# Changelog

All notable changes…
…semver explanation…

---

## [X.Y.Z] — YYYY-MM-DD   ← INSERT HERE

…new entry…

---

## [3.0.0] — …            ← previous entry stays here
```

### docs/changelog.md
Same content, same position. This file has the same structure — prepend the new entry above the previous one. The `docs/changelog.md` version omits the HTML comment template block at the bottom of CHANGELOG.md.

### package.json
Update `"version"` to the new version string. Change only that field.

## Step 6 — Commit, push, tag

Run these in order:

```bash
# Stage the three changed files
git add CHANGELOG.md docs/changelog.md package.json

# Commit
git commit -m "chore: release vX.Y.Z"

# Push main
git push origin main

# Tag and push the tag (this triggers the GitHub Release workflow)
git tag vX.Y.Z
git push origin vX.Y.Z
```

After pushing the tag, tell the user:
> Done! The GitHub Actions release workflow will create a GitHub Release at
> https://github.com/Hackbyrd/orbital-express/releases in about 30 seconds.

## Notes

- Use today's date (read from the system if needed) in `YYYY-MM-DD` format.
- Only include changelog sections that have content — omit empty ones entirely.
- If the user mentions breaking changes at any point, make sure a `### ⚠ Breaking Changes` section is included even if they didn't call it that explicitly.
- The `docs/changelog.md` entry must match `CHANGELOG.md` exactly — same wording, same sections, same bullets. The only difference is the docs version doesn't include the HTML comment template.
- If the user says "never mind" or "not yet" at any point, stop cleanly without writing any files.
