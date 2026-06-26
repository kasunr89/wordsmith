import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWords } from './bot';

test('parseWords returns a single word', () => {
    assert.deepEqual(parseWords('kruus'), ['kruus']);
});

test('parseWords splits multiple words on newlines', () => {
    assert.deepEqual(parseWords('kahvel\nlusikas\nnuga'), [
        'kahvel',
        'lusikas',
        'nuga',
    ]);
});

test('parseWords trims surrounding whitespace', () => {
    assert.deepEqual(parseWords('  peegel  '), ['peegel']);
});

test('parseWords filters blank lines', () => {
    assert.deepEqual(parseWords('kruus\n\nkahvel'), ['kruus', 'kahvel']);
});

test('parseWords lowercases words', () => {
    assert.deepEqual(parseWords('Kruus'), ['kruus']);
});
