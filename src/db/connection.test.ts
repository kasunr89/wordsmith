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
