import { db } from '../db/connection';

export type InsertResult = 'saved' | 'known';

export async function insertWord(word: string): Promise<InsertResult> {
  try {
    await db('words').insert({ word });
    return 'saved';
  } catch (err: unknown) {
    if (err !== null && typeof err === 'object' && 'code' in err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return 'known';
    }
    throw err;
  }
}
