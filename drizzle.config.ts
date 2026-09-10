import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl || !authToken) {
    throw new Error(
        "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set before running Drizzle Kit."
    );
}

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "turso",
    dbCredentials: {
        url: databaseUrl,
        authToken,
    },
});
