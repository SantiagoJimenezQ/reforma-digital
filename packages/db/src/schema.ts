import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  vector,
  index,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { SearchResult, Source } from "@gov/core";
export const sourcesTable = pgTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  organization: text("organization").notNull(),
  jurisdictionType: text("jurisdiction_type").notNull(),
  jurisdictionValue: text("jurisdiction_value").notNull(),
  sourceType: text("source_type").notNull(),
  authorityScore: integer("authority_score").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  crawlConfig: jsonb("crawl_config").$type<Source["crawlConfig"]>().notNull(),
  lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
});
export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sourcesTable.id),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    markdown: text("markdown").notNull(),
    organization: text("organization").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    authorityScore: integer("authority_score").notNull(),
    applicabilityYear: integer("applicability_year"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    crawledAt: timestamp("crawled_at", { withTimezone: true }).notNull(),
    contentHash: text("content_hash").notNull(),
    indexable: boolean("indexable").notNull().default(false),
    available: boolean("available").notNull().default(true),
    unavailableAt: timestamp("unavailable_at", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    embeddingModel: text("embedding_model"),
    indexConfigHash: text("index_config_hash"),
  },
  (t) => [
    uniqueIndex("documents_url_idx").on(t.canonicalUrl),
    index("documents_source_idx").on(t.sourceId),
  ],
);
export const chunks = pgTable(
  "chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    heading: text("heading").notNull(),
    position: integer("position").notNull(),
    tokenCount: integer("token_count").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (t) => [index("chunks_document_idx").on(t.documentId)],
);
export const documentVersions = pgTable("document_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id),
  contentHash: text("content_hash").notNull(),
  markdown: text("markdown").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const searches = pgTable("searches", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  result: jsonb("result").$type<SearchResult>().notNull(),
});
export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  searchId: uuid("search_id")
    .notNull()
    .references(() => searches.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  reason: text("reason"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});
export const experiments = pgTable("experiments", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  report: jsonb("report").notNull(),
});
