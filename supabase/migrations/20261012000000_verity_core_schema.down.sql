-- ==============================================================================
-- Verity Enterprise Platform — Rollback Core Schema Migration
-- Migration: 20261012000000_verity_core_schema.down.sql
-- ==============================================================================

DROP TABLE IF EXISTS published_units CASCADE;
DROP TABLE IF EXISTS drafts CASCADE;
DROP TABLE IF EXISTS candidate_units CASCADE;
DROP TABLE IF EXISTS ingestion_jobs CASCADE;
DROP TABLE IF EXISTS source_files CASCADE;
DROP TABLE IF EXISTS source_documents CASCADE;
