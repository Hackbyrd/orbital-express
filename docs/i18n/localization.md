# Internationalization (i18n) & Localization

## Overview

The i18n system has three layers: **source files** (JS), **compiled output** (JSON), and a **runtime service**. The cardinal rule is:

> Never edit `locales/*.json` directly. Always edit `languages/*.js` source files, then run `yarn lang`.

---

## The Flow

```
languages/en.js              (global source — GLOBAL namespace)
app/*/languages/en.js        (feature source — FEATURENAME namespace)
        ↓  yarn lang
locales/en.json              (compiled — do not edit)
        ↓  runtime
services/language.js         (i18n middleware + getLocalI18n())
```

---

## Key Naming Convention

All keys follow the pattern `NAMESPACE[snake_case_key]`:

- **Namespace** — `ALL_CAPS`. Use the feature name (`ADMIN`, `USER`, `BOOKING`) or `GLOBAL` for shared strings.
- **Key** — `all_lowercase_with_underscores`. No camelCase, no dashes, no mixed case.

```
GLOBAL[unauthorized]
GLOBAL[internal_server_error]
USER[profile_not_found]
ADMIN[invalid_login_credentials]
ORDER[payment_failed]
```

---

## Source Files

### Global strings — `languages/en.js`

Strings shared across the entire app. Use the `GLOBAL` namespace.

```javascript
// languages/en.js
module.exports = {
  'GLOBAL[unauthorized]':          'You do not have permission to make this request.',
  'GLOBAL[internal_server_error]': 'Oops... something went wrong.',
};
```

### Feature strings — `app/<Feature>/languages/en.js`

Strings scoped to one feature. Use the feature name as the namespace.

```javascript
// app/Admin/languages/en.js
module.exports = {
  // V1Login
  'ADMIN[invalid_login_credentials]': 'The email and/or password you entered is incorrect.',
  'ADMIN[admin_account_inactive]':    'Admin account is inactive.',

  // V1Create
  'ADMIN[admin_already_exists]':      'Admin user already exists.',
};
```

**Grouping by action:** Organize keys with inline comments by the action that uses them. This makes it easy to find and delete keys when you remove an action.

### Interpolation

Use `{{variable}}` syntax for dynamic values:

```javascript
'ADMIN[reset_email_success_message]': 'An email has been sent to {{email}}. Please check your email.',
```

In the action:

```javascript
res.__('ADMIN[reset_email_success_message]', { email: args.email });
```

---

## Compiling — `yarn lang`

Running `yarn lang` invokes `services/language.js compile()`, which:

1. Loads `languages/en.js` (global strings)
2. Walks every `app/*/languages/en.js` (feature strings)
3. Merges all keys into one flat object
4. Writes `locales/en.json`

```json
// locales/en.json (compiled — do not edit manually)
{
  "GLOBAL[unauthorized]": "You do not have permission to make this request.",
  "ADMIN[invalid_login_credentials]": "The email and/or password you entered is incorrect."
}
```

`yarn test` runs `yarn lang` automatically before Jest starts, so a missing or misnamed key fails fast before any test runs.

---

## Runtime Service (`services/language.js`)

### In actions (HTTP)

Locale is set automatically by middleware — you never call `setLocale` manually. The detection order is:

1. `req.user.locale` — logged-in user's saved preference (set in `middleware/auth.js`)
2. `lang` argument — if any request passes `lang` in `req.args`, `middleware/args.js` calls `req.setLocale()` and removes it from `req.args`
3. `i18n-locale` cookie — persisted from a prior locale switch
4. Default locale (`en`)

Use `req.__('KEY')` or `res.__('KEY')` directly in actions:

```javascript
res.__('ADMIN[reset_email_success_message]', { email: args.email });
```

### In tasks (background jobs)

Tasks run in a worker process — there is no `req` object. Use `getLocalI18n()` and set the locale manually from `job.data`:

```javascript
const { getLocalI18n } = require('../../services/language');

// In the action — capture locale when enqueueing
Queue.add('V1SendWelcomeEmailTask', {
  userId: user.id,
  locale: req.user.locale,
});
```

```javascript
// In the task — set locale on a fresh local instance
const i18n = getLocalI18n();
i18n.setLocale(job.data.locale || 'en');

const message = i18n.__('ADMIN[reset_email_success_message]', { email: user.email });
```

**Why `getLocalI18n()` instead of a shared instance?** The i18n module is stateful. Sharing one instance across concurrent jobs means one job can change the locale and bleed into another. `getLocalI18n()` returns a fresh object scoped to the request or job.

The `yarn gen` task scaffolding template includes this locale boilerplate automatically. Remove it if the task produces no user-facing strings.

### In services

Same as tasks — use `getLocalI18n()` directly.

---

## Key Safety

Two mechanisms prevent missing translation keys from reaching users silently:

**Compile-time (`validateKeys`):** After `yarn lang` compiles, it scans all JS files in `app/`, `services/`, `helpers/`, and `middleware/` for static `.__('KEY')` calls and verifies every key exists in the compiled default locale. In `test` and `production` environments this throws and aborts the process. In development it prints a yellow warning.

**Runtime (`missingKeyFn`):** If a key is missing at runtime, the i18n middleware calls `missingKeyFn`. In `test` and `production` this throws immediately. In development it logs a red error and returns the raw key string so the app does not crash.

Together these mean a missing translation key will fail loudly at compile time (during `yarn lang`) and again at runtime if one slips through.

**Common gotcha:** If the test suite won't start and shows an error about a missing i18n key, you used a `.__('KEY')` that is not defined. Add it to `languages/*.js` and run `yarn lang`.

---

## Adding a New Translation Key

1. Add the key/value pair to the appropriate `languages/*.js` file (global or feature)
2. Run `yarn lang` to recompile
3. Reference the key in your action with `req.__('KEY')` or `res.__('KEY')`

Use the **`add-locale`** skill for step-by-step guidance.

---

## Adding a New Locale

1. Create the corresponding language file in every feature folder and the global `languages/` folder (e.g., `languages/fr.js` and `app/*/languages/fr.js`)
2. Add the locale identifier (e.g., `'fr'`) to the `LOCALES` constant in `helpers/constants.js`
3. Run `yarn lang` to compile

> A helper script to scaffold a new language file across all features at once is tracked as a TODO in `app/feature.js`.

Use the **`add-locale`** skill — it handles this end-to-end.

---

## Connection to Error Codes

i18n keys appear in error code definitions inside `app/<Feature>/error.js`. The `messages` array holds the translation keys:

```javascript
ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: {
  error: 'ADMIN.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS',
  status: 400,
  messages: ['ADMIN[invalid_login_credentials]']
}
```

When you add an error code, add the corresponding translation key to `languages/en.js` in the same commit and run `yarn lang`. The `add-error-code` skill walks through both steps together.

---

## Gulp Watch

The gulpfile watches `languages/*.js` files. When running `yarn gulp`, any change to a language source file automatically recompiles to `locales/*.json` — the same thing `yarn lang` does, but continuously. Useful during active development on translated copy.
