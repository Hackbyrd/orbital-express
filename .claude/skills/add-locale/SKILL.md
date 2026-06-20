---
name: add-locale
description: Add a new language/locale (e.g. Spanish 'es', French 'fr') to the i18n system, or add/edit translation keys. Use when the user asks to "add a language", "support translations/i18n", or "add a translation key".
---

# Add a locale / translation keys

i18n source files are co-located per feature (`app/<Feature>/languages/<locale>.js`) plus the global `languages/<locale>.js`. They compile into `locales/<locale>.json` via **`yarn lang`** — never edit `locales/*.json` directly. Read README "Global Languages / Locales". For the full deep reference, see `docs/core/errors.md`.

## Add (or edit) a translation key
1. Add the key to the relevant `languages/en.js` (feature-level for feature strings, global `languages/en.js` for shared). Format: **`NAMESPACE[snake_case]`** — `NAMESPACE` = feature name ALL_CAPS or `GLOBAL`; key lowercase_with_underscores. Interpolate with `{{var}}`.
2. Add the same key to **every** other locale file that exists (each locale must have the same keys).
3. Run **`yarn lang`** — it compiles `locales/` and **validates** that every static `.__('KEY')` in the code exists. It throws in test/prod on missing keys (and `yarn test` runs it first), so always run it after editing.
4. Use it: `req.__('NAMESPACE[key]', { var })` in actions, `i18n.__(...)` (from `getLocalI18n()`) in tasks/services.

## Add a brand-new locale (e.g. 'es')
1. Create `languages/<locale>.js` (global) AND `app/*/languages/<locale>.js` for **every** feature folder (e.g. Order, Product, Post) — each must contain the full key set (mirror `en.js`).
2. Add the locale code to the **`LOCALES`** array and `LOCALE` map in `helpers/constants.js` (`LOCALE` keys are UPPER_CASE: `{ EN: 'en', ES: 'es' }`; `LOCALES: ['en','es']`, first index is the default).
3. Run `yarn lang` to compile.

## Using translations: actions vs tasks
- **In an Express action:** locale is set automatically (detection order: `req.user.locale` → `lang` in `req.args` → `i18n-locale` cookie → default `en`). **Never call `setLocale` manually.** Use `req.__('NS[key]', { var })` or `res.__(...)`.
- **In a task/service** (no `req`): get a fresh instance and set the locale yourself — `const i18n = lang.getLocalI18n(); i18n.setLocale(job.data.locale || 'en');` then `i18n.__('NS[key]')`. When enqueuing a job that produces user-facing strings, pass `locale: req.user.locale` in `job.data`.
- Never `require('i18n')` directly in a task/service — shared state bleeds across concurrent jobs. Always `getLocalI18n()`.

## Notes
- `LOCALES` count must match the number of language files in every feature + global folder.
- A missing key in any file surfaces at runtime via `missingKeyFn` and at compile time via `validateKeys` — both are intentional safety nets (both throw in test/prod).
