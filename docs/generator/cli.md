# The Generator (yarn gen / yarn del)

## Why generators?

Consistency. Every feature, action, and task looks identical. No hand-crafting.

## Generate a feature

```bash
yarn gen Order
```

Creates the full feature folder:

- app/Order/model.js
- app/Order/controller.js
- app/Order/routes.js
- app/Order/worker.js
- app/Order/helper.js
- app/Order/error.js
- app/Order/actions/index.js + V1Example.js
- app/Order/tasks/index.js + V1ExampleTask.js
- app/Order/languages/en.js
- app/Order/tests/integration/ + tests/tasks/

Also updates: routes.js, models.js, worker.js, database/sequence.js

## Remove the placeholder files immediately

```bash
yarn del Order -a V1Example
yarn del Order -t V1ExampleTask
```

Remove helper.test.js if no custom helpers.

## Generate an action

```bash
yarn gen Order -a V1Create
```

Creates app/Order/actions/V1Create.js + test file. Updates actions/index.js automatically.

## Generate a task

```bash
yarn gen Order -t V1ProcessTask
```

## Generate a mailer

```bash
yarn gen Order -m OrderConfirmation
```

## Delete commands

```bash
yarn del Order -a V1Create        # removes action + test + index.js entry
yarn del Order -t V1ProcessTask
yarn del Order -m OrderConfirmation
yarn del Order                    # removes entire feature
```

Always use `yarn del`, never `rm` — `del` updates aggregator files, `rm` leaves broken exports.

## yarn lang

Compile i18n after editing languages/ files.

```bash
yarn lang
```
