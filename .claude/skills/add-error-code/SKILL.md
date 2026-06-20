---
name: add-error-code
description: Add a new client error code (4xx) to a feature and return it from an action in this codebase. Use when the user needs a new error response, a business-rule rejection, or asks to "add an error code / error message".
---

# Add an error code

Error codes live in each feature's `error.js`, are auto-aggregated into the global `ERROR_CODES` at startup, and pair with an i18n string. Read README "error.js" and "services/error.js". For the full deep reference, see `docs/core/errors.md`.

## Shape (in `app/<Feature>/error.js`, inside `LOCAL_ERROR_CODES`)
```javascript
// V1Create            ← group by the action that owns it
<FEATURE>_BAD_REQUEST_INVALID_CREDENTIALS: {
  error: '<FEATURE>.BAD_REQUEST_INVALID_CREDENTIALS', // dot after namespace
  status: 400,
  messages: ['<FEATURE>[invalid_credentials]'] // array of i18n keys
}
```

## Naming (three parts: NAMESPACE _ STATUS _ DESCRIPTION)
- **JS object key:** `NAMESPACE_STATUS_DESCRIPTION` — all caps, underscores throughout (`ORDER_BAD_REQUEST_INVALID_STATUS`).
- **`.error` string (sent to client):** `NAMESPACE.STATUS_DESCRIPTION` — a **dot** after the namespace, underscores elsewhere (`'ORDER.BAD_REQUEST_INVALID_STATUS'`).
- **Status phrasing** maps to the code: `BAD_REQUEST`→400, `UNAUTHORIZED`→401, `NOT_FOUND`→404, `INTERNAL_SERVER_ERROR`→500.
- **Namespace** = feature name ALL_CAPS. Truly global codes omit it and live in `services/error.js` (`BAD_REQUEST_INVALID_ARGUMENTS`, `UNAUTHORIZED`, `INTERNAL_SERVER_ERROR`, `SERVICE_UNAVAILABLE`).

## `messages` is an array
One conceptual error can carry multiple phrasings; pick one by index at the call site. Default to a single-entry array; you never need the index until a second phrasing exists.

## Wire it up
1. Add the code to `app/<Feature>/error.js`, grouped under a `// V1Action` comment.
2. Add the i18n string(s) to `app/<Feature>/languages/en.js` (and every other locale) as `<FEATURE>[snake_case]`; run **`yarn lang`** (it validates keys — missing ones throw in test/prod). See `add-locale`.
3. Use it in the action:
   ```javascript
   return errorResponse(req, ERROR_CODES.<FEATURE>_BAD_REQUEST_X);              // default message (index 0)
   return errorResponse(req, ERROR_CODES.<FEATURE>_BAD_REQUEST_X, 1);           // alternate message by index
   return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error)); // custom string (Joi)
   ```
   In a transaction, use `errorResponseRollback(t, req, ERROR_CODES.X)` to roll back first. In tasks/socket actions, `throw` instead of `errorResponse`.
4. **Add the code to the action's JSDoc `Errors:` list** — and **write a test** that triggers it and asserts `errorResponse(i18n, ERROR_CODES.X)`. Every documented error code must have a test.
