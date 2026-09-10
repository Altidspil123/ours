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

---

# Update #2 — chat alerts (seen receipts + splash signal + notifications)

Your app now has: read receipts in chat ("seen" under the last message),
a droplets **signal button** (the batman signal, one tap), an unread badge on
the Chat tab, and real notifications. Two one-time setup steps bring it live:

## A — update the database (30 seconds)

1. Vercel → **Storage** tab → your `ours` database → **Open in Neon**.
2. Left menu → **SQL Editor**.
3. Open **`db-update-chat-alerts.sql`** from this project → select all → copy → paste → **Run**.
   (It only adds new columns/tables; nothing existing is touched.)

## B — turn on closed-app notifications (optional, ~2 minutes)

Do this and your phone buzzes even when the app is fully closed:

1. In Vercel: **Settings → Environment Variables** → add these two:

   | Name | Value |
   |---|---|
   | `VAPID_PUBLIC_KEY` | the public key from the pair we generated (starts with `B…`) |
   | `VAPID_PRIVATE_KEY` | the private key from the same pair |

2. **Deployments → ⋯ → Redeploy** (env changes always need a redeploy).
3. Open the app on each phone → go to **Chat** → tap the **bell** chip
   ("turn on alerts") → allow notifications.
4. **iPhone extra step:** iOS only pushes to installed apps — first do
   Safari → share → **Add to Home Screen**, then open *that* icon and tap the bell.

*Skipping step B is fine*: you still get in-chat banners, sounds, the title
flash, the unread badge, and browser notifications whenever the tab is open.

Then, as always: push the new code to GitHub and Vercel redeploys by itself.

---

# Update #3 — edit & pin messages + memories notifications

New: edit and delete your own messages, pin any message to the top of the
chat, and a badge + notification when one of you posts to the Memories wall.

**One database step:** Neon → **SQL Editor** → paste all of
**`db-update-chat-edit-pin.sql`** → **Run**. (Adds three columns to
`messages` and one small table. Nothing existing is touched.)

Then push the code and Vercel redeploys itself. No new env vars needed —
memory notifications reuse the same `VAPID_*` keys as the chat ones.

### How the new bits work
- **Long-press** a message on your phone (or right-click / hover the **…**
  on a computer) to open the actions.
- **Edit / Delete** appear only on your own messages; a signal can be
  deleted but not edited. Edited messages show a small "edited" tag.
- **Pin** works on either of your messages — pinned ones stay in a bar at
  the top of the chat (up to 3), and tapping one jumps to it.
- **Memories:** posting sends the other person a notification, and the
  Memories tab shows a badge until they open the wall.
- **Photo upload:** "Pin a moment" now opens your phone's gallery/camera.
  Photos are shrunk on your phone before saving (max 1600px), so they stay
  small in the database — no image hosting or extra service needed. Pasting
  a link still works via "or paste a link instead".

---

# Update #4 — memories timeline + the hideaway

**No database step needed for this one.** Just push the code.

> ### ⚠️ Your existing cards, photos and messages are safe
> Nothing we ship ever deletes your data. Specifically:
> - **Your custom deck cards (with their pictures) stay exactly as they are.**
>   The `spicy_cards` table is unchanged, and the app only ever adds the
>   default starter cards **when the deck is completely empty** — since
>   yours isn't, it will never touch them.
> - The `db-update-*.sql` files only **add** new columns and tables.
> - Only ever run **`db-setup.sql`** on a brand-new empty database.

- **Memories** is now a timeline: photos grouped by month down a rose thread,
  newest first, each with the date and who pinned it.
- **The hideaway** — the moon button, top-right of Home. A full-screen
  YouTube video background (fireplace by default) with its own sound, plus
  your own uploaded songs layered on top and separate volume sliders.
  Everything lives behind the "…".
  - Backgrounds use YouTube's official embed player — nothing is downloaded
    or re-hosted, so the creator keeps their views. Add more any time by
    pasting a link into "add a background from YouTube".
  - Songs you upload are stored **on that phone only** (browser storage),
    never on the server. So each of you builds your own little playlist.
  - Browsers block audio until you interact, hence "tap anywhere for sound".
