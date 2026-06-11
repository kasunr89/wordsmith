# Database Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Note:** Per user instruction, do NOT run `git commit` as part of executing this plan. Git has been initialized but commits are left to the user's discretion.

**Goal:** Set up a TypeScript SQLite database module (Knex + better-sqlite3) with a `words` table and a migration system, ready for the collector/enrichment/scheduler/bot sub-projects to build on.

**Architecture:** A Knex instance configured with the `better-sqlite3` client reads its per-environment config (connection filename, migrations directory) from `knexfile.ts`. Schema lives as versioned migration files in `migrations/`, applied via `runMigrations()` (called automatically on app startup, and from a standalone `migrate` script for CI/manual use). All DB access goes through the typed `db` export and the `Word` interface.

**Tech Stack:** TypeScript, Knex, better-sqlite3, tsx, Node's built-in test runner (`node:test`)

---

## File Structure

```
word-smith/
├── package.json            # modify: scripts + deps
├── tsconfig.json            # create
├── .gitignore                # create
├── data/.gitkeep             # create
├── knexfile.ts               # create
├── migrations/
│   └── 20260611120000_create_words_table.ts   # create
├── src/
│   ├── index.ts             # create
│   └── db/
│       ├── types.ts          # create
│       ├── connection.ts     # create
│       └── connection.test.ts # create
└── scripts/
    ├── migrate.ts            # create
    ├── rollback.ts           # create
    └── make-migration.ts     # create
```

---

### Task 1: Project setup — dependencies, TypeScript config, gitignore

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `data/.gitkeep`

- [ ] **Step 1: Install runtime and dev dependencies**

Run:
```bash
npm install knex better-sqlite3
npm install -D typescript tsx @types/node @types/better-sqlite3
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*", "migrations/**/*", "scripts/**/*", "knexfile.ts"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
data/*
!data/.gitkeep
```

- [ ] **Step 4: Create `data/.gitkeep`**

Empty file — keeps the `data/` directory tracked in git while its contents (the SQLite file) stay ignored.

```bash
mkdir -p data && touch data/.gitkeep
```

- [ ] **Step 5: Update `package.json` scripts**

Replace the `"scripts"` block with:

```json
"scripts": {
  "test": "NODE_ENV=test tsx --test src/db/connection.test.ts",
  "start": "tsx src/index.ts",
  "migrate": "tsx scripts/migrate.ts",
  "migrate:rollback": "tsx scripts/rollback.ts",
  "migrate:make": "tsx scripts/make-migration.ts"
}
```

- [ ] **Step 6: Verify toolchain installed**

Run:
```bash
npx tsc --version && npx tsx --version
```
Expected: both print version numbers (no errors).

---

### Task 2: `Word` type and Knex config

**Files:**
- Create: `src/db/types.ts`
- Create: `knexfile.ts`

- [ ] **Step 1: Create `src/db/types.ts`**

```ts
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
```

- [ ] **Step 2: Create `knexfile.ts`**

```ts
import path from 'node:path';
import type { Knex } from 'knex';

const config: Record<string, Knex.Config> = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: path.join(__dirname, 'data', 'vocab.sqlite'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
    },
  },
  test: {
    client: 'better-sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
    },
  },
};

export default config;
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

---

### Task 3: Initial migration + connection module (TDD)

**Files:**
- Test: `src/db/connection.test.ts`
- Create: `migrations/20260611120000_create_words_table.ts`
- Create: `src/db/connection.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/db/connection.test.ts
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, runMigrations } from './connection';
import type { Word } from './types';

before(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await db('words').del();
});

after(async () => {
  await db.destroy();
});

test('migration creates words table with expected columns', async () => {
  const hasTable = await db.schema.hasTable('words');
  assert.equal(hasTable, true);

  const columns = await db('words').columnInfo();
  assert.deepEqual(Object.keys(columns).sort(), [
    'created_at',
    'due_date',
    'ease',
    'english',
    'example',
    'genitive',
    'id',
    'partitive',
    'topic',
    'word',
  ]);
});

test('can insert and retrieve a word', async () => {
  await db<Word>('words').insert({ word: 'kruus', english: 'mug' });

  const row = await db<Word>('words').where('word', 'kruus').first();

  assert.ok(row);
  assert.equal(row?.english, 'mug');
  assert.equal(typeof row?.id, 'number');
});

test('word column enforces uniqueness', async () => {
  await db<Word>('words').insert({ word: 'kruus', english: 'mug' });

  await assert.rejects(() =>
    db<Word>('words').insert({ word: 'kruus', english: 'duplicate' })
  );
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:
```bash
npm test
```
Expected: FAIL — error resolving `./connection` (module does not exist yet).

- [ ] **Step 3: Create the initial migration**

```ts
// migrations/20260611120000_create_words_table.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('words', (table) => {
    table.increments('id');
    table.text('word').notNullable().unique();
    table.text('english');
    table.text('genitive');
    table.text('partitive');
    table.text('example');
    table.text('topic');
    table.float('ease');
    table.text('due_date');
    table.text('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('words');
}
```

Note: `table.increments('id')` already generates `INTEGER PRIMARY KEY AUTOINCREMENT` for the better-sqlite3 dialect — don't chain an additional `.primary()`, which would produce a duplicate primary key error.

- [ ] **Step 4: Create the connection module**

```ts
// src/db/connection.ts
import path from 'node:path';
import fs from 'node:fs';
import Knex from 'knex';
import knexConfig from '../../knexfile';

const env = process.env.NODE_ENV ?? 'development';
const config = knexConfig[env];

const connection = config.connection;
if (connection && typeof connection === 'object' && 'filename' in connection) {
  const filename = connection.filename as string;
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
}

export const db = Knex(config);

export async function runMigrations(): Promise<void> {
  await db.migrate.latest();
}
```

`fs.mkdirSync` is needed because better-sqlite3 throws if `data/` doesn't exist yet when opening the database file.

- [ ] **Step 5: Run the test and verify it passes**

Run:
```bash
npm test
```
Expected: PASS — 3 tests passing (`migration creates words table...`, `can insert and retrieve a word`, `word column enforces uniqueness`).

---

### Task 4: App entry point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create `src/index.ts`**

```ts
import { runMigrations } from './db/connection';

async function main(): Promise<void> {
  await runMigrations();
  console.log('Database ready');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Run it and verify the database file is created**

Run:
```bash
npm start
```
Expected: prints `Database ready`.

Then run:
```bash
ls data/
```
Expected: `vocab.sqlite` is listed alongside `.gitkeep`.

---

### Task 5: Migration CLI scripts

**Files:**
- Create: `scripts/migrate.ts`
- Create: `scripts/rollback.ts`
- Create: `scripts/make-migration.ts`

- [ ] **Step 1: Create `scripts/migrate.ts`**

```ts
import { db } from '../src/db/connection';

db.migrate
  .latest()
  .then(([batch, log]: [number, string[]]) => {
    if (log.length === 0) {
      console.log('Already up to date');
    } else {
      console.log(`Batch ${batch} run: ${log.length} migrations`);
      log.forEach((name) => console.log(`  ${name}`));
    }
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
```

- [ ] **Step 2: Create `scripts/rollback.ts`**

```ts
import { db } from '../src/db/connection';

db.migrate
  .rollback()
  .then(([batch, log]: [number, string[]]) => {
    if (log.length === 0) {
      console.log('Already at the base migration');
    } else {
      console.log(`Batch ${batch} rolled back: ${log.length} migrations`);
      log.forEach((name) => console.log(`  ${name}`));
    }
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
```

- [ ] **Step 3: Create `scripts/make-migration.ts`**

```ts
import fs from 'node:fs';
import path from 'node:path';

const name = process.argv[2];

if (!name) {
  console.error('Usage: npm run migrate:make <migration_name>');
  process.exit(1);
}

const timestamp = new Date()
  .toISOString()
  .replace(/[-:T]/g, '')
  .replace(/\.\d+Z$/, '');

const filename = `${timestamp}_${name}.ts`;
const filepath = path.join(__dirname, '..', 'migrations', filename);

const template = `import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
}

export async function down(knex: Knex): Promise<void> {
}
`;

fs.writeFileSync(filepath, template);
console.log(`Created migrations/${filename}`);
```

- [ ] **Step 4: Verify `migrate` against the dev database**

Run:
```bash
npm run migrate
```
Expected: `Already up to date` (Task 4 already ran this migration against `data/vocab.sqlite`).

- [ ] **Step 5: Verify `rollback` and re-`migrate` round-trip**

Run:
```bash
npm run migrate:rollback
```
Expected: `Batch 1 rolled back: 1 migrations` followed by the migration filename.

Run:
```bash
npm run migrate
```
Expected: `Batch 2 run: 1 migrations` followed by the migration filename — the `words` table is recreated.

- [ ] **Step 6: Verify `migrate:make` and clean up**

Run:
```bash
npm run migrate:make -- add_test_column
```
Expected: `Created migrations/<timestamp>_add_test_column.ts`.

Inspect the generated file to confirm it has empty `up`/`down` functions matching the template, then remove it (it's only for verifying the script works — leaving an empty migration would create a no-op entry in the migration history):

```bash
rm migrations/<timestamp>_add_test_column.ts
```
