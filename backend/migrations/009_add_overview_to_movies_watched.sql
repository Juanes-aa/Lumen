-- Migration 009: add overview column to movies_watched
-- overview stores the TMDB synopsis of the movie, used by the analysis AI.

ALTER TABLE movies_watched
    ADD COLUMN IF NOT EXISTS overview text;
