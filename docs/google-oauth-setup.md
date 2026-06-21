# Google OAuth Setup — "Sign in with Google"

How to provision the Google OAuth credentials that power `/v1/users/googleauthstart` + `/v1/users/googlelogin`.

> The client **secret lives only on the backend** — the OAuth code exchange happens server-side (`services/google.js`), so nothing sensitive touches the frontend.

## A. Google Cloud Console

1. **Project** — at [console.cloud.google.com](https://console.cloud.google.com), create or select a project for your app.

2. **OAuth consent screen** — *APIs & Services → OAuth consent screen* (newer console: *Google Auth Platform → Branding / Audience*):
   - **User type:** choose **Internal** if your app is restricted to a Google Workspace domain, or **External** for public sign-in.
   - App name, support email, and developer contact email.
   - **Scopes:** `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.

3. **OAuth client** — *APIs & Services → Credentials → Create Credentials → OAuth client ID* (newer: *Clients → Create client*):
   - **Application type: Web application**, name it appropriately.
   - **Authorized JavaScript origins:** `http://localhost:3000` (dev), `https://yourdomain.com` (prod).
   - **Authorized redirect URIs** (must match exactly): `http://localhost:3000/auth/google/callback` (dev), `https://yourdomain.com/auth/google/callback` (prod).
   - Copy the **Client ID** and **Client secret**.

   One client can hold both dev and prod origins/redirects — no need for a second client.

## B. Backend env

Add to `config/.env.development` (and `config/.env` / your host for prod):

```
GOOGLE_CLIENT_ID=<client id>
GOOGLE_CLIENT_SECRET=<client secret>
GOOGLE_REDIRECT_URI_WEB=http://localhost:3000/auth/google/callback
```

- `GOOGLE_REDIRECT_URI_WEB` must be **byte-identical** to the redirect URI in Console and to where the frontend runs.
- Production: set `GOOGLE_REDIRECT_URI_WEB=https://yourdomain.com/auth/google/callback`.

## C. Allowed domains

Sign-in can be gated to specific domains via `ALLOWED_EMAIL_DOMAINS` in `helpers/constants.js`. `V1GoogleLogin` rejects any domain not in the list. Add or remove domains there as needed. Remove the check entirely if your app allows any Google account.

## D. Verify

1. Run API (`yarn s`, :8000) and your frontend (e.g. :3000).
2. Visit your login page → **Continue with Google** → consent → back to `/auth/google/callback` → home.
3. Test that a disallowed domain is rejected at the backend domain check.

## Related

- Flow + endpoints: `app/User/actions/V1GoogleAuthStart.js`, `app/User/actions/V1GoogleLogin.js`, `services/google.js`.
- Access design + tokens: `docs/auth-migration.md`.
