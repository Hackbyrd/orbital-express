---
name: add-fixtures
description: Add test fixtures and/or dev seed data for a feature/table in this codebase. Use when a new table needs baseline test data, tests fail because a table is empty, or the user asks to "add fixtures / seed data / test data".
---

# Add fixtures (test data) and seed data (dev data)

Two parallel datasets: **fixtures** load into the **test** DB (`test/fixtures/`), **seed** loads into the **dev** DB (`database/seed/`). Both mirror the table structure. Read README "fixtures" and "The Seed Data via seed folder".

## Fixtures (for tests) — `test/fixtures/fix1/<feature>.js`
- Export an **array of records** mirroring the table columns.
- **Comment every record** explaining its role and intentional relationships (e.g. "order2 belongs to user1 — used for ownership/access tests").
- **Fixtures are BASELINES, not scenarios.** Provide a clean, minimal, representative starting state. Do NOT make a fixture per test case (`fix1_product_inactive` ❌). Tests load the baseline and **mutate it in-test** (`models.x.update(...)`) for the scenario.
- Only create a new set (`fix2`) when the baseline *topology* is fundamentally different — not for a status/flag variation.
- Respect FK ordering: parents before children. `database/sequence.js` (auto-maintained by `yarn gen`) defines the load order, so `populate()` inserts in dependency order.

## Compile the SQL fixture — `yarn sql fix1`
`populate('fix1')` in tests loads `test/fixtures/fix1.sql`, which is **generated** from the JS fixtures by `yarn sql fix1` (it's gitignored and regenerated; `yarn test` runs it first). After editing any `fix1/*.js`, run `yarn sql fix1` so the SQL reflects your changes.

## Seed data (for dev) — `database/seed/set1/<feature>.js`
- Same idea for the development DB. Keep just a few "sets" with the bare minimum (don't proliferate sets — each must be updated on every schema change).
- Load with the seed command; `database/sequence.js` controls order here too.

## Steps
1. Add `test/fixtures/fix1/<feature>.js` (array, commented records, baseline).
2. Run `yarn sql fix1` to regenerate `fix1.sql`.
3. (If dev data is useful) add `database/seed/set1/<feature>.js`.
4. Confirm `<feature>` is in `database/sequence.js` in dependency order (the generator adds it; verify position vs its FKs).
5. Run the feature's tests (`npx jest app/<Feature>/tests --runInBand`) — they `reset()` + `populate('fix1')` each test.
