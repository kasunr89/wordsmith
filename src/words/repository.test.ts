import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, runMigrations } from '../db/connection';
import { insertWord } from './repository';

before(async () => {
    await runMigrations();
});

beforeEach(async () => {
    await db('words').del();
});

after(async () => {
    await db.destroy();
});

test('insertWord saves a new word and returns saved', async () => {
    const result = await insertWord('kruus');
    assert.equal(result, 'saved');

    const row = await db('words').where('word', 'kruus').first();
    assert.ok(row);
    assert.equal(row.word, 'kruus');
});

test('insertWord returns known for a duplicate without throwing', async () => {
    await insertWord('kruus');
    const result = await insertWord('kruus');
    assert.equal(result, 'known');
});

test('insertWord does not create duplicate rows', async () => {
    await insertWord('kruus');
    await insertWord('kruus');
    const rows = await db('words').where('word', 'kruus');
    assert.equal(rows.length, 1);
});
