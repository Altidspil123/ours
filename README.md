# ours. — a universe for two

A private, passcode-sealed web app for exactly two people:

- **Home** — days-together counter, daily conversation spark, everything at a glance
- **Chat** — whispers delivered every 3 seconds, no one else can read them
- **The Deck** — a card game for nights that shouldn't be ordinary; attach your own pictures to any card
- **Calendar** — events with shared checklists, overlaid with her cycle predictions
- **Cycle** — learns her real rhythm, predicts next period, fertile days and ovulation on a beautiful wheel
- **Memories** — a photo wall of moments you never want to lose

Built with **Next.js 16**, **PostgreSQL + Drizzle ORM**, **Tailwind CSS 4**, and **Framer Motion**.

---

## Run it locally

```bash
cp .env.example .env   # fill in your values
npm install
npx drizzle-kit push   # creates the database tables
npm run dev
```

Open http://localhost:3000 — the code is whatever you set as `APP_PASSCODE`.

## Put it on the internet (free, forever)

See **[DEPLOY.md](./DEPLOY.md)** — it's written for someone who has never deployed anything before. Ten minutes, zero dollars.

## The environment variables

| Key | What it is |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `APP_PASSCODE` | your shared lock-screen code |
| `AUTH_SECRET` | long random string that signs the login cookie |

Whoever holds the code owns the door. Keep it between the two of you.
