import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Reads DATABASE_URL from your local .env automatically.
// Point it at your Neon database, then run:  npx drizzle-kit push
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing — copy .env.example to .env and fill it in.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
