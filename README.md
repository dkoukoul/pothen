# POTHEN Watch

A tool to parse, store, and visualize "Pothen Esches" (Asset Declaration) reports from Greek MPs.

## Stack

- **Backend**: Bun, Hono, Prisma, SQLite/Postgres.
- **Frontend**: Vite, React, TypeScript, Recharts.
- **Database**: PostgreSQL (via Prisma).

## Setup

1. **Install Dependencies**

   ```bash
   bun install
   cd frontend && bun install && cd ..
   ```

2. **Database Setup**
   Ensure your `.env` has `DATABASE_URL` set.

   ```bash
   bunx prisma db push
   ```

3. **Import Data**
   Parse a PDF declaration:
   ```bash
   bun src/scripts/import_pdf.ts path/to/declaration.pdf
   ```

## Running the App

You need two terminals:

1. **Start Backend API**

   ```bash
   bun index.ts
   ```

   Runs on `http://localhost:3000`.

2. **Start Frontend**
   ```bash
   cd frontend
   bun run dev
   ```
   Runs on `http://localhost:5173`.

## Features

- **Dashboard**: Overview of total income, deposits, and top earners.
- **Comparison**: Graphs comparing MPs.
- **Details**: Full breakdown of income sources, real estate, and investments per MP.
