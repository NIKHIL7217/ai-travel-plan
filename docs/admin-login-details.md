# Admin Login Details (Local Dev)

## Current Admin Access Rule

In this project, admin access is role-based (`role: admin`) and verified using backend tracked users.

- Frontend checks user role from session
- Backend admin routes re-validate admin role from `users.json`
- Optional secret check is enforced when configured

So email pattern alone is no longer enough.

## Recommended Admin Account For Local Testing

Use this email pattern to test now:

- Email: admin@wanderai.local
- Password: create at signup time (do not hardcode in repo docs)

To assign admin role for this email, set in `admin-api-server/.env`:

```
ADMIN_BOOTSTRAP_EMAILS=admin@wanderai.local
ADMIN_API_SECRET=change-me-strong-secret
ENFORCE_ADMIN_SECRET=true
```

Important:

- If this account does not exist yet, first go to Login page and use **Create account** with the same credentials.
- After signup, use the same credentials for future admin logins.
- Do not commit real passwords in docs/repo.

## Where To Open

- Frontend: http://localhost:5174/
- Admin page: http://localhost:5174/admin
- Backend API: http://localhost:8787/api/health

## How To Change Admin Login In Future

Option 1 (no code change):

- Add the email to `ADMIN_BOOTSTRAP_EMAILS` in backend env.
- Re-login so backend upsert/auth event refreshes role.

Option 2 (code rule change):

- Update admin-check logic in:
  - `src/utils/adminAccess.js`
  - `src/pages/Admin.vue`
  - `src/router/index.js`
  - `src/App.vue`

Current implementation is strict role-based for admin access.

## Security Note

This is still local/dev auth shape. For production, add signed token/session verification on backend for every request.
