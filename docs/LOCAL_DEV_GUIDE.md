# Local Development Guide for 4o Legacy

This guide shows you how to run the site on your computer, make changes safely, test them, and then push to the live site. Follow this every time.

## The Golden Rule

**Never change the live site directly. Always test locally first.**

```
Your computer (safe)  -->  GitHub (code storage)  -->  Vercel (live site)
```

Changes flow left to right. You work on the left. Users see the right.

---

## First-Time Setup (Do Once)

### 1. Make sure Docker is running

Open Docker Desktop. You should see the whale icon in your menu bar. If Docker isn't running, the database won't start.

### 2. Start the local database

Open Terminal, navigate to the project, and run:

```bash
cd ~/Projects/websites/4o-remembered/4o-legacy
npx supabase start
```

This starts a local copy of Supabase (the database) inside Docker. It takes a minute the first time. When it finishes, you'll see URLs and keys — you don't need to copy these, they're already in `.env.local`.

### 3. Load test data

```bash
npx supabase db reset
```

This wipes the local database and reloads everything fresh: all tables + test data (sample posts, test users). It does NOT touch the live site.

### 4. Start the website

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the site with test posts.

### 5. Test login credentials

| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@test.local | password123 |
| Regular user | user@test.local | password123 |

Sign in as `admin@test.local` to see the "Review Submissions" link and admin dashboard.

---

## Daily Workflow

Every time you sit down to work:

### Step 1: Start the local services

```bash
# Make sure Docker Desktop is running first!
cd ~/Projects/websites/4o-remembered/4o-legacy
npx supabase start    # Start local database
npm run dev            # Start local website
```

### Step 2: Make your changes

Edit code in your editor (VS Code, Cursor, etc). The site at http://localhost:3000 will automatically reload when you save files.

### Step 3: Verify it works locally

- Check the page you changed in the browser
- Click around to make sure nothing is broken
- Sign in as admin to test admin features
- Check the browser console (right-click > Inspect > Console tab) for errors

### Step 4: Run the tests

```bash
npm test
```

All tests should pass. If any fail, fix the code before continuing.

### Step 5: Check TypeScript

```bash
npx tsc --noEmit
```

This checks for type errors without building. Should show no output (no errors).

### Step 6: Commit and push

```bash
git add -A
git status                    # Review what you're committing
git commit -m "description of what you changed"
git push origin main
```

Pushing to `main` automatically triggers a Vercel deployment. The live site updates in about 1 minute.

### Step 7: Verify the live site

After pushing, check https://4olegacy.com to confirm your changes look right.

---

## Common Tasks

### Reset the local database (start fresh)

```bash
npx supabase db reset
```

This re-runs all migrations and reloads the test data. Use this when:
- Your local data is messed up
- You changed a migration file
- You want a clean slate

### Stop everything when you're done

```bash
# Press Ctrl+C in the terminal running `npm run dev`
npx supabase stop    # Stop the local database (frees Docker resources)
```

### See what's in the local database

Open http://127.0.0.1:54323 in your browser. This is Supabase Studio — a visual database browser. You can see tables, run queries, and inspect data.

### Add a new database migration

```bash
npx supabase migration new my_migration_name
```

This creates a new file in `supabase/migrations/`. Write your SQL there. Then run `npx supabase db reset` to apply it.

---

## What NOT to Do

| Don't | Do instead |
|-------|-----------|
| Edit code on Vercel dashboard | Edit locally, push to GitHub |
| Run SQL on production Supabase without testing locally | Test the SQL on local Supabase first |
| Use `vercel deploy` from the command line | Push to GitHub and let Vercel auto-deploy |
| Change `.env.local` to point at production | Keep it pointing at local Supabase |
| Commit `.env.local` to git | It's already in `.gitignore` |

---

## File Layout

```
4o-legacy/
├── .env.local              # Your local environment (DO NOT COMMIT)
├── src/                    # All the website code
│   ├── app/                # Pages and API routes
│   ├── components/         # Reusable UI pieces
│   ├── hooks/              # React hooks (like useAuth)
│   ├── lib/                # Utilities (validation, Supabase client)
│   └── types/              # TypeScript type definitions
├── supabase/
│   ├── migrations/         # Database schema changes (numbered, run in order)
│   ├── seed.sql            # Test data for local development
│   └── seed_real_content.sql  # Real content (for production only!)
├── docs/                   # This guide and other docs
└── package.json            # Dependencies and scripts
```

---

## Troubleshooting

### "Port 3000 is in use"

Another process is using port 3000. Either:
- Close the other terminal running `npm run dev`
- Or use the port Next.js suggests (e.g., 3001)

### "supabase start" hangs or fails

- Make sure Docker Desktop is running
- Try `npx supabase stop` then `npx supabase start` again
- If Docker is low on memory, increase it in Docker Desktop > Settings > Resources

### "Authentication is not configured"

Your `.env.local` is probably missing or pointing at the wrong URL. It should say:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

### Tests fail after changing code

Run `npx tsc --noEmit` first to check for type errors. Fix those before running tests.

### Local site shows no posts

Run `npx supabase db reset` to reload the test data.

---

## Environment Diagram

```
LOCAL (your computer)                    PRODUCTION (live site)
─────────────────────                    ──────────────────────
localhost:3000          ──git push──>    4olegacy.com
  │                                        │
  ▼                                        ▼
Local Supabase                           Hosted Supabase
(Docker, port 54321)                     (dulxptwlrrtnlzhqapwd.supabase.co)
  │                                        │
  ▼                                        ▼
Test data only                           Real user data
(safe to destroy)                        (DO NOT DELETE)
```

These are completely separate. Nothing you do locally affects the live site until you `git push`.
