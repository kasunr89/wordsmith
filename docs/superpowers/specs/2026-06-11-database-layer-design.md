# Database Layer Design

## Context

This is the first of five sub-projects that make up the Estonian Vocabulary
Learning System (see `~/Desktop/Estonian Vocabulary Learning System.pdf` for
the full system spec):

1. **Database layer** (this spec)
2. Collector service (Telegram inbox → text/photo/voice extraction → DB)
3. Enrichment (OpenAI calls for genitive/partitive/example sentences)
4. FSRS scheduler (spaced repetition logic)
5. Quiz bot (Telegraf review flow + commands)

This spec covers only the database layer: schema, query builder, and
migration tooling that sub-projects 2-5 will build on. It corresponds to the
"SQLite database + word storage" portion of the system spec's Day 1 MVP.

## Goal

Set up a TypeScript SQLite database module backed by Knex (query builder +
migrations) and better-sqlite3 (driver), with an initial `words` table
matching the system spec's schema.

## Decisions

- **Language**: TypeScript
- **Query builder**: Knex
- **Driver**: better-sqlite3 — synchronous native bindings, fastest and most
  actively maintained option for Node SQLite, well-supported as a Knex client
  (`client: 'better-sqlite3'`), and what the system spec calls for.
- **Migrations**: Knex's built-in migration system, used from day one so
  later sub-projects (especially the FSRS scheduler, which will likely need
  additional review-state columns/tables) can evolve the schema cleanly via
  new migration files rather than editing existing ones.

## Architecture & File Structure

A standalone DB module that the collector, enrichment, scheduler, and bot
sub-projects will import.

```
word-smith/
├── knexfile.ts            # Knex config (dev/test/prod)
├── migrations/            # Knex migration files (TS)
│   └── 20260611120000_create_words_table.ts
├── data/                   # SQLite file lives here (gitignored)
│   └── vocab.sqlite
├── src/
│   └── db/
│       ├── connection.ts  # exports configured Knex instance
│       └── types.ts       # TS row interfaces (Word)
├── tsconfig.json
└── package.json
```

Other modules consume this via `import { db } from './db/connection'` and
query with `db<Word>('words')...`.

## Schema & Initial Migration

```ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('words', (table) => {
    table.increments('id').primary();
    table.text('word').notNullable().unique();
    table.text('english');
    table.text('genitive');
    table.text('partitive');
    table.text('example');
    table.text('topic');
    table.float('ease');
    table.text('due_date');                       // ISO8601 string
    table.text('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('words');
}
```

Notes:

- SQLite has no native datetime type, so `due_date` and `created_at` are
  stored as ISO8601 text.
- `word` is `NOT NULL UNIQUE` — it's the natural key for a vocabulary entry.
- This migration matches the system spec's `words` table exactly. Any
  additional columns/tables needed by later sub-projects (e.g. FSRS state)
  are added via new migrations, not by editing this one.

## Connection Module & Types

```ts
// src/db/types.ts
export interface Word {
  id: number;
  word: string;
  english: string | null;
  genitive: string | null;
  partitive: string | null;
  example: string | null;
  topic: string | null;
  ease: number | null;
  due_date: string | null;
  created_at: string;
}

// src/db/connection.ts
export const db = Knex(knexConfig[process.env.NODE_ENV ?? 'development']);
```

## Dev Workflow

- **Migrations run automatically on app startup** (`db.migrate.latest()`), so
  deploying to a small VPS/Pi needs no separate manual migration step.
- `package.json` scripts for dev convenience:
  - `migrate:make <name>` → `knex migrate:make`
  - `migrate:latest` → `knex migrate:latest` (manual run, e.g. for first-time setup or CI)
  - `migrate:rollback` → `knex migrate:rollback`

## Testing

Tests use an in-memory SQLite database (`:memory:`) with migrations run via a
setup helper, so they never touch `data/vocab.sqlite`.

## New Dependencies

- `knex`
- `better-sqlite3`
- `@types/better-sqlite3`
- `typescript`
- `tsx`
- `@types/node`

## Out of Scope

- Telegram collector, OpenAI enrichment, FSRS scheduler, and quiz bot logic —
  each is its own sub-project with its own spec.
- Any additional tables/columns beyond the `words` table defined in the
  system spec (e.g. FSRS review-state fields, review log table). These will
  be introduced via new migrations when the FSRS scheduler sub-project is
  designed.
