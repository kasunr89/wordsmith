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
