# MongoDB Atlas setup, migration and rollback

## Architecture
- Firebase Authentication remains enabled only for admin/staff sign-in, custom roles and secure session cookies.
- MongoDB Atlas stores application data: users, leads, appointments, gold rates, branches and blog posts.
- MongoDB Compass is optional and connects to the same Atlas cluster for viewing/editing records.
- Firestore is not used by the running application.

## 1. Create MongoDB Atlas
1. Create an Atlas account and a free M0 cluster.
2. Database Access: create a database user with a strong password.
3. Network Access: for local testing add your current IP. For Vercel, add `0.0.0.0/0` and use a strong password because Vercel outbound IPs are dynamic.
4. Connect > Drivers > Node.js and copy the connection string.
5. URL-encode special characters in the database password (`@`, `:`, `/`, `#`, `%`, etc.).

## 2. Configure `.env.local`
Copy `.env.example` to `.env.local` and set:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=capital_gold
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_WEB_API_KEY=...
INITIAL_ADMIN_EMAIL=...
```

Never commit `.env.local`. The old Firebase key previously shared must be revoked and replaced.

## 3. Install and prepare MongoDB
```powershell
npm install
npm run mongo:check
npm run mongo:setup
npm run db:seed:production
```
`db:seed:production` now writes application seed data through the MongoDB adapter while still creating Firebase Auth accounts.

## 4. Optional Firestore data migration
Run this before deleting Firestore data. It reads every existing collection once and upserts it into MongoDB:

```powershell
npm run mongo:migrate
npm run mongo:setup
```
If Firestore quota is currently exhausted, wait for the quota reset or skip migration and start with fresh MongoDB data.

## 5. Run and verify
```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```
Open `/api/health`, then test admin login, dashboard, contact form, appointments, rates, branches and blog.

## 6. Vercel deployment
Add all `.env.local` values to Vercel Project Settings > Environment Variables, especially `MONGODB_URI`, `MONGODB_DB` and Firebase Auth variables. Redeploy after saving.

## MongoDB Compass
Install Compass, select “New Connection”, paste `MONGODB_URI`, and open the `capital_gold` database. Compass is only a GUI; Atlas is the hosted database.

## Rollback to Firestore
The original Firestore adapter and package files are stored in `rollback/firestore/`.

Windows PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\rollback\restore-firestore.ps1
```

macOS/Linux:
```bash
./rollback/restore-firestore.sh
```
Then restore the Firestore environment variables, clear `.next`, and restart. MongoDB data is not deleted by rollback.

## Safety rollback before deployment
Create a Git checkpoint first:
```powershell
git add .
git commit -m "Checkpoint before MongoDB migration"
git tag before-mongodb-migration
```
To return to it later:
```powershell
git reset --hard before-mongodb-migration
```
