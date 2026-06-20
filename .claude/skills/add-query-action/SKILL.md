---
name: add-query-action
description: Build a Query/list/read-all endpoint with pagination, filtering, and sorting in this Express/Sequelize codebase. Use when the user asks to "list/query/search/paginate" records, add a "get all" or "index" endpoint, or filter results by ranges/dates/status.
---

# Add a Query (list) action

A Query action returns many records with pagination, sorting, and filtering. It leans on `helpers/cruqd.js` (CRUQD = Create, Read, Update, Query, Delete). First do the `add-action` skill to scaffold the action/controller/route; this skill covers the Query-specific body. Read README "helpers/cruqd.js".

## The helpers (import from `helpers/cruqd.js`)
- `getOffset(page, limit)` → Sequelize `offset`.
- `getOrdering(cols)` → `order` array. Comma-separated; prefix `-` for DESC (`'-createdAt,name'`).
- `getOrderingWithModel(cols, models)` → ordering by associated-model columns (`'user.lastName'`).
- `convertStringListToWhereStmt(whereStmt, args, [{ name, col, isInt }])` → turns `'1,2,3'` arg into `{ col: { [Op.in]: [...] } }` and deletes the arg.
- `parseUrlQueryFilter(args)` → converts bracket operators (`createdAt[gte]`) to Sequelize ops. **Already run on `req.args` by `middleware/args.js`** for every request — so range filters arrive pre-converted; just pass `req.args` (or a subset) into `where`.
- `convertToSequelizeOps(obj)` → convert a Joi-validated `{ gte, lte }` object to Sequelize ops manually.
- `numberComparisonSchema()` (from `helpers/schemas.js`) → Joi for an exact number OR `{ gte, lte, ... }`.

## Body pattern
```javascript
async function V1QueryByUser(req, res) {
  const schema = joi.object({
    page:  joi.number().integer().min(1).default(1),
    limit: joi.number().integer().min(1).max(100).default(25),
    sort:  joi.string().default('-createdAt'),
    status: joi.string().valid(...POST_STATUSES).optional(),
    createdAt: numberComparisonSchema().optional(), // supports createdAt[gte] etc.
    // ...other filterable fields
  });
  const { error, value } = schema.validate(req.args);
  if (error) return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    // SECURITY: always scope the query to the owner — never return another user's rows
    const whereStmt = { userId: req.user.id };
    if (req.args.status) whereStmt.status = req.args.status;
    if (req.args.createdAt) whereStmt.createdAt = convertToSequelizeOps(req.args.createdAt);

    const { count, rows } = await models.post.findAndCountAll({
      where: whereStmt,
      order: getOrdering(req.args.sort),
      limit: req.args.limit,
      offset: getOffset(req.args.page, req.args.limit),
      attributes: { exclude: models.post.getSensitiveData?.() || [] }
    });

    return { status: 200, success: true, posts: rows, total: count, page: req.args.page, limit: req.args.limit };
  } catch (error) { throw error; }
}
```

## Rules
- **Always scope to the owner** (`where: { userId: req.user.id }`) — the flattened owner FK makes this a flat, indexed filter. Never let a list leak another user's records.
- Validate `page`/`limit` with sane defaults and a `max` on `limit` (prevent unbounded scans).
- Flat response; name the array after the content (`posts`, `orders`, `products`), include `total`/`page`/`limit`. Status `200`.
- Exclude sensitive data (`getSensitiveData()`).
- Tests: assert pagination (counts, page boundaries), each filter, sort order, and owner-scoping (a user cannot see another user's rows). See `write-tests`.
