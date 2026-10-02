import { pgTable, text, integer, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import type { SearchResult } from '@reforma-digital/core';
export const searches = pgTable('searches', {
  id: uuid('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  result: jsonb('result').$type<SearchResult>().notNull(),
});
export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  searchId: uuid('search_id')
    .notNull()
    .references(() => searches.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  reason: text('reason'),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
});
export const experiments = pgTable('experiments', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  report: jsonb('report').notNull(),
});
