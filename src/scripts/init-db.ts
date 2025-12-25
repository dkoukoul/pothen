import { $ } from "bun";

async function initDb() {
    console.log("🔄 Initializing database from Prisma schema...");

    const dbUrl = Bun.env.DATABASE_URL;

    if (!dbUrl) {
        console.error("❌ Error: DATABASE_URL environment variable is not set.");
        console.error("Please set it in your .env file or environment variables.");
        process.exit(1);
    }

    try {
        // 1. Generate Prisma Client
        console.log("📦 Generating Prisma Client...");
        await $`bunx prisma generate`;

        // 2. Push schema to database
        // This command creates the database if it doesn't exist (assuming permission)
        // and applies the schema commands.
        console.log("🚀 Pushing schema to database...");
        await $`bunx prisma db push`;

        console.log("✅ Database initialized successfully!");
    } catch (error) {
        console.error("❌ Error initializing database:", error);
        process.exit(1);
    }
}

initDb();
