---
name: add-mailer
description: Add a transactional email (mailer) to a feature and send it from an action or task in this codebase. Use when the user asks to "add an email/mailer", "send an email when X happens", or create an email template.
---

# Add a mailer

Emails are EJS templates under a feature's `mailers/` folder, sent via the global `services/email.js`. Read README "Mailers".

## Steps

1. **Scaffold:** `yarn gen <Feature> -m <MailerName>`. Creates `app/<Feature>/mailers/<Feature><MailerName>/index.ejs`. (The feature name is auto-prepended if not already present.) **Never hand-create.**

2. **Write `index.ejs`:**
   - Top comment listing the `args` (template variables) the email expects.
   - Reference every variable as `locals.<var>` with a default fallback (e.g. `<%= locals.firstName || 'there' %>`) — required so the gulpfile can generate `preview.html` without erroring.
   - Always include the test-email banner driven by `locals.isTestEmail` (so non-prod emails are visibly marked).

3. **Preview:** run `yarn gulp` (watches `index.ejs` and regenerates `preview.html`). You won't see a `preview.html` until the gulpfile runs.

4. **Send it** from an action or task via `services/email.js`:
   ```javascript
   const email = require('../../../services/email');
   await email.send({
     from: email.emails.<sender>.address,
     name: email.emails.<sender>.name,
     subject: '...',
     template: '<Feature><MailerName>', // = the mailer folder name
     tos: [recipientEmail],
     ccs: null, bccs: null,
     args: { firstName, ... } // the template variables
   });
   ```
   - Sending email is usually best done in a **background task** (enqueue from the action), not inline in the request — see the `add-task` skill.

5. **Tests:** assert the email service was called (`jest.spyOn(email, 'send')`) with the right template + args; in task tests assert the send happened as a side effect. Real sends use the provider sandbox in test env.

## Notes
- Mailers can also live in the **global** `mailers/` directory (not tied to a feature) for app-wide emails — same `index.ejs`/`preview.html` structure.
- The `template` value passed to `email.send` is the mailer **folder name** (`<Feature><MailerName>`).
- Example feature names: `Order`, `Product`, `Post` — e.g. `yarn gen Order -m Confirmation` creates `app/Order/mailers/OrderConfirmation/index.ejs`.
