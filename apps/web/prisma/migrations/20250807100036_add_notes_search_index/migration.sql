-- Add full-text search index for notes
CREATE INDEX "note_search_idx" 
  ON "public"."notes" 
  USING GIN (to_tsvector('simple', title || ' ' || content::text));