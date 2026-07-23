# MongoDB-Only Setup and Rollback

This version uses MongoDB Atlas for both business data and admin/staff authentication. Firebase is not required.

## Security design

- Passwords are never stored as plain text. They are salted and hashed with Node.js `scrypt`.
- Login sessions are HMAC-SHA256 signed, HTTP-only cookies.
- Each user has a `sessionVersion`. Password resets, role changes, and account disabling revoke existing sessions.
- Protected requests verify the signed cookie and the current MongoDB user record.
- Login rate limiting uses server memory and causes no database writes.

## 1. Create MongoDB Atlas

1. Create a free Atlas cluster.
2. Database Access: create a database user.
3. Network Access: during local testing add your current IP. For Vercel, allow `0.0.0.0/0` and use a strong database password.
4. Copy the Drivers connection string.
5. URL-encode special characters in the database password.

MongoDB Compass is optional. Paste the same Atlas connection string into Compass to inspect data.

## 2. Configure environment

```powershell
Copy-Item .env.example .env.local
```

Required values:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=capital_gold
SESSION_SECRET=LONG_RANDOM_SECRET
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=StrongPasswordHere
```

Generate the session secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never commit `.env.local`.

## 3. Install and initialize

```powershell
npm install
npm run mongo:check
npm run mongo:setup
npm run db:seed:production
npm run dev
```

After the first successful seed, remove `INITIAL_ADMIN_PASSWORD` and staff password values from Vercel/local environment. Running the seed again with password values intentionally resets those users' passwords and revokes their sessions.

## 4. Existing users from Firebase

Firebase password hashes cannot be exported as usable plain passwords through this project. Create/reset the MongoDB account using `INITIAL_ADMIN_PASSWORD`, or create staff accounts from Dashboard > Staff after logging in.

Business records already migrated to MongoDB remain unchanged.

## 5. Vercel

Add the same `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`, and other business variables to Vercel. Do not add Firebase variables. Redeploy after changing variables.

## 6. Verify

```powershell
npm run typecheck
npm run build
```

Test:

1. Admin login.
2. Wrong-password rejection.
3. Add staff and log in as staff.
4. Disable staff and confirm their session is rejected.
5. Change password and confirm the old session/password no longer works.

## Roll back authentication to Firebase

A copy of the previous Firebase-auth implementation is in `rollback/firebase-auth/`.

```powershell
powershell -ExecutionPolicy Bypass -File .\rollback\restore-firebase-auth.ps1
npm install
```

Then restore Firebase environment variables and restart. MongoDB business data is not deleted.

## Roll back the whole database to Firestore

The older full Firestore rollback remains available:

```powershell
powershell -ExecutionPolicy Bypass -File .\rollback\restore-firestore.ps1
npm install
```

This only restores code. It does not copy MongoDB records back into Firestore.
