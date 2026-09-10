# Update your live “ours.” website safely

This guide updates the existing GitHub/Vercel/Neon site while preserving all
existing data — especially the custom Deck cards and their pictures.

## What stays untouched

Your data lives in Neon, separately from the GitHub code. Replacing the code
does not replace the database.

The update does **not** delete or modify existing:

- custom Deck cards or card pictures
- names and anniversary
- real messages
- memories
- events and checklists
- period/cycle history

The app's Deck seed also checks whether any card exists and stops immediately,
so it will not add starter cards to your existing custom deck.

---

## Before starting

You need:

- access to the GitHub repository: `Altidspil123/ours`
- access to its Vercel project
- access to its Neon database
- the downloaded `ours-complete-update.zip`

Do the steps in the order below. Updating Neon first is intentional: the old
site continues to work with the extra database columns, while the new site
needs them to exist.

---

## Step 1 — create a Neon backup branch (recommended)

This is a safety net. The SQL update is additive and does not delete anything,
but having a backup is still good practice.

1. Open [console.neon.tech](https://console.neon.tech) and choose the database
   connected to the live site.
2. Open **Branches** in the left menu.
3. Click **New branch**.
4. Name it `before-big-update`.
5. Create it from the current production/main branch.

Do not change Vercel's connection string. The new branch is only a backup.

---

## Step 2 — update the live Neon database

1. In that same Neon project, switch back to the production/main branch.
2. Open **SQL Editor**.
3. Open `LIVE-UPDATE.sql` from the downloaded update folder.
4. Select all its text and copy it.
5. Paste it into Neon’s SQL Editor.
6. Click **Run**.
7. Neon should report successful `ALTER TABLE`, `CREATE TABLE`, and
   `CREATE INDEX` statements. “Already exists” notices are harmless if part of
   an earlier update was already run.

### Important

Do **not** run `db-setup.sql` on the existing site. That file is for creating a
brand-new empty database. For this update, run only `LIVE-UPDATE.sql`.

### Step 2B — make the live site factory-fresh but preserve the custom cards

You specifically asked to remove the old usage history while keeping every
custom Deck card and picture. Do this only after creating the Neon backup branch:

1. In Neon’s production/main branch, stay in **SQL Editor**.
2. Open `LIVE-RESET-KEEP-CARDS.sql` from the update folder.
3. Read the warning at the top so you know exactly what it removes.
4. Copy the whole file, paste it into Neon, and click **Run**.
5. The final result table lists every preserved custom card. Confirm the titles
   and image URLs look correct before continuing.

This resets messages, seen receipts, pins, memories, events, cycle history,
Deck pull history, couple names/anniversary, and push subscriptions. It never
truncates, updates, or deletes from `spicy_cards`.

If you decide you want to keep the existing live messages, memories, events,
names, anniversary, and draw history after all, skip Step 2B entirely.

---

## Step 3 — download a backup of the current GitHub code

1. Open `https://github.com/Altidspil123/ours`.
2. Click the green **Code** button.
3. Click **Download ZIP**.
4. Keep that ZIP somewhere safe until the update is confirmed working.

This is a code backup. The Neon branch from Step 1 is the data backup.

---

## Step 4 — replace the code using GitHub Desktop

GitHub Desktop is the safest beginner-friendly method because it shows exactly
what will change and preserves the repository’s history.

### Install and clone

1. Install GitHub Desktop from
   [desktop.github.com](https://desktop.github.com).
2. Sign in with the GitHub account that owns the repository.
3. In GitHub Desktop choose **File → Clone repository**.
4. Select `Altidspil123/ours` and click **Clone**.
5. In GitHub Desktop choose **Repository → Show in Explorer** on Windows, or
   **Show in Finder** on Mac.

### Copy the update into the clone

1. Extract `ours-complete-update.zip`.
2. Open the extracted `ours-complete-update` folder.
3. Select everything inside it, including dotfiles such as `.gitignore` and
   `.env.example`.
4. Copy those files into the cloned `ours` folder.
5. Choose **Replace files** / **Merge folders** when asked.
6. Do not delete the hidden `.git` folder in the cloned repository.
7. Do not create or upload a `.env` file. Production secrets remain in Vercel.

### Commit and push

1. Return to GitHub Desktop. It should show the changed and new files.
2. Review the list. `.env`, `node_modules`, and `.next` should not appear.
3. In the summary box enter: `Add chat, calendar, memories, and hideaway updates`
4. Click **Commit to main**.
5. Click **Push origin**.

Vercel should automatically start a new deployment after the push.

---

## Step 5 — check Vercel’s existing environment variables

1. Open [vercel.com](https://vercel.com) and choose the `ours` project.
2. Go to **Settings → Environment Variables**.
3. Confirm these already exist:
   - `DATABASE_URL`
   - `APP_PASSCODE`
   - `AUTH_SECRET`
4. Do not replace `DATABASE_URL`; it already points to the live database with
   the custom cards.

### Optional: notifications when the app is closed

In-app badges and alerts work without this. For real push notifications when
the app is closed, add:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Generate a fresh pair in a terminal with:

```text
npx web-push generate-vapid-keys
```

Add the generated values to Vercel for Production, Preview, and Development.
After adding/changing environment variables, redeploy the newest deployment.
Never commit the private key to GitHub.

---

## Step 6 — wait for and inspect the Vercel deployment

1. Open the Vercel project’s **Deployments** tab.
2. Open the deployment triggered by the GitHub commit.
3. Wait for the status to become **Ready**.
4. If it fails, open **Build Logs** and do not delete or recreate the Neon
   database. The backup branches and cards are still safe.

---

## Step 7 — test the live site

Open the normal production URL — not a Vercel preview URL.

Test in this order:

1. Log in with the existing live `APP_PASSCODE`.
2. Open **Deck** and confirm the original custom cards and pictures are there.
3. Draw one card and confirm it behaves normally.
4. Open **Chat**:
   - send a normal message
   - edit it
   - pin and unpin it
   - delete it
   - send the splash signal
   - use a second phone/profile to confirm “seen”
5. Open **Calendar** and confirm upcoming events are listed nearest-first.
6. Open **Memories**:
   - upload one picture from the phone gallery
   - confirm it appears in the timeline
   - confirm the other profile gets a badge
7. From Home, tap the subtle moon button:
   - confirm the fireplace video loads
   - tap once to allow sound
   - test the ambience volume
   - optionally add a YouTube background
   - optionally upload a song and remove it again
8. Scroll content behind the top and bottom bars to confirm the blur.

---

## Step 8 — enable notifications on each phone

### iPhone

1. Open the production site in Safari.
2. Tap **Share → Add to Home Screen**.
3. Open the installed Home Screen app.
4. Go to Chat and tap the notification bell.
5. Allow notifications when iOS asks.

### Android

1. Open the production site in Chrome.
2. Choose **Install app** / **Add to Home screen**.
3. Open the installed app.
4. Go to Chat, tap the notification bell, and allow notifications.

Each phone/browser needs to opt in separately.

---

## Important behavior to remember

- Neon stores the shared app data and the original cards.
- Uploaded memory photos are compressed and stored in Neon.
- Songs uploaded inside the hideaway are stored only in that particular
  browser/device, not Neon. Clearing that browser’s site data removes them.
- Custom YouTube backgrounds are also remembered by that browser/device.
- YouTube supplies the embedded background video and its ambience; the video
  owner must allow embedding.

---

## Rollback if anything looks wrong

### Roll back only the code

1. In Vercel, open **Deployments**.
2. Find the last known-good deployment.
3. Open its menu and choose **Promote to Production** / **Redeploy**.

The added database columns can remain; the old code ignores them.

### Restore database data

This should not be needed because `LIVE-UPDATE.sql` never deletes or changes
existing rows. If necessary, use the `before-big-update` Neon branch created in
Step 1. Do not switch Vercel to it unless recovery is actually required.
