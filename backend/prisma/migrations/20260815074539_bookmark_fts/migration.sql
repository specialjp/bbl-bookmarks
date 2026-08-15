-- Full-text search over bookmark title + notes (ADR-011).
-- Generated STORED column: always in sync, no triggers, version-proof
-- (rejected Prisma's fullTextSearch preview flag — unstable across majors).
ALTER TABLE "Bookmark"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce("title", '') || ' ' || coalesce("notes", ''))
  ) STORED;

CREATE INDEX "Bookmark_searchVector_idx" ON "Bookmark" USING GIN ("searchVector");
