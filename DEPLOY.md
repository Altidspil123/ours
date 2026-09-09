# Publish "ours." — the short version

Four stops, ~15 minutes, $0/month. No terminal required at all.

```
Step 1  GitHub Desktop  →  your code gets a home on the internet
Step 2  Vercel          →  your app becomes a real link
Step 3  Neon (inside Vercel!)  →  database creates itself, wires itself
Step 4  paste db-setup.sql     →  tables appear, app fully alive
Tip     Add to Home Screen on both phones — it's an app now.
```

---

## Step 1 — GitHub Desktop (uploads your code, ~5 clicks)

1. Download **[desktop.github.com](https://desktop.github.com)** → install → open it.
2. It asks you to sign in → **Sign in to GitHub.com** (browser opens, log in or create account, click Authorize).
3. Back in Desktop: menu **File → Add Local Repository…**
4. **Choose…** → pick your `ours` project folder → it says "This directory does not appear to be a Git repository" → click the blue link **"create a repository"** → **Create Repository**.
5. Top of the app: click **Publish repository**.
   - Name: `ours`
   - **Keep "Keep this code private" CHECKED** ← *this* is the private part
   - Description optional → **Publish Repository**.

✅ Done when: github.com shows `yours/ours` with all the project files.
(Your `.env` with secrets is automatically left out — git's rules.)

## Step 2 — Vercel (turns the repo into a live link)

1. **[vercel.com](https://vercel.com)** → Sign up → **Continue with GitHub**.
2. **Add New… → Project** → Install the GitHub integration → select the `ours` repo → **Import**.
3. On the Configure page, open **Environment Variables** and add **just these two** (name + value + click Add):

   | Name | Value |
   |---|---|
   | `APP_PASSCODE` | your couple code, e.g. `always-and-forever` |
   | `AUTH_SECRET` | a long random mess of 40+ characters, e.g. `k7h2f9qxa1mz4vbn8s3w6ey0tu5rpld2ikc8gxh9j4qrs` |

4. Press **Deploy**. ~1 min later you get `https://….vercel.app`.
   Opening it now shows an error — normal, the database is Step 3.

## Step 3 — the database creates itself

1. In your Vercel project, click the **Storage** tab at the top (if you see "Integrations", click that instead, same thing).
2. Click the **Neon** option (or search "Neon") → **Create Database** / **Accept** whatever it asks.
3. A form: database name `ours`, region near you → **Create / Connect**.
4. Finish — Vercel now **automatically creates the database AND adds `DATABASE_URL` to your env vars**. Nothing to copy. Nothing to paste.
5. Go to **Deployments** (top tabs) → click **⋯** on the latest one → **Redeploy** → confirm. (This restarts the app so it sees the new database.)

## Step 4 — create the tables (paste 1 file)

1. Stay in Vercel → **Storage** tab → click your `ours` database → **Open in Neon** (this opens the Neon console, your database's control room).
2. In Neon's left menu, click **SQL Editor**.
3. Open the file **`db-setup.sql`** from this project, select all, copy.
4. Paste into the SQL Editor → press **Run**. "Success" appears.
   *(Zero-terminal alternative done right there. If you have Node and prefer the command: `npx drizzle-kit push` with `DATABASE_URL` in `.env` does the same.)*
5. Open your `vercel.app` link → tap Him/Her → type your `APP_PASSCODE` → **inside**. Set your anniversary on the home screen.

## Final touch — make it a phone app

- **iPhone:** Safari → share → **Add to Home Screen**
- **Android:** Chrome → **⋮** → **Add to Home screen** → Install

## If something breaks

| Symptom | Fix |
|---|---|
| Lock screen never appears / pages error | Deployments → ⋯ → **Redeploy** (after database was added). 90% of issues. |
| "Wrong code, love" but it's right | It's case-insensitive but spaces count. Check `APP_PASSCODE` in Vercel → Settings → Environment Variables, then redeploy after changing it. |
| SQL Editor says a table "already exists" | It just means you ran Step 4 twice — harmless, ignore. |
| Changed env vars but nothing happened | Any env change needs a **Redeploy** to take effect. |
| `*.vercel.app` link is ugly | Settings → Domains → pick any free name there, or link a real domain (free). |

Stuck on any exact screen? Screenshot what you see and ask — walking you through takes a minute.
