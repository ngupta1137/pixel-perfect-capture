-- ==============================================================================
-- Verity Enterprise Platform — Authoritative PostgreSQL Schema
-- Migration: 20261012000000_verity_core_schema.sql
-- Compatible with Supabase PostgreSQL and standard PostgreSQL 15+
-- ==============================================================================

-- 1. Source Documents (Authoritative uploaded document metadata)
CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  owner_team TEXT NOT NULL,
  lob TEXT NOT NULL,
  plan_year TEXT,
  state_code TEXT,
  source_type TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deduplication index on SHA-256 hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_documents_hash ON source_documents (content_hash);
CREATE INDEX IF NOT EXISTS idx_source_documents_created ON source_documents (created_at DESC);

-- 2. Source Files (Storage metadata and binary tracking)
CREATE TABLE IF NOT EXISTS source_files (
  id TEXT PRIMARY KEY,
  source_doc_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_bucket TEXT,
  storage_path TEXT,
  file_size INTEGER,
  content_hash TEXT,
  data_base64 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_files_doc ON source_files (source_doc_id);

-- 3. Ingestion Jobs (Extract pipeline audit)
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id TEXT PRIMARY KEY,
  source_doc_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  extractor TEXT NOT NULL,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  notes_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_doc ON ingestion_jobs (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs (status);

-- 4. Candidate Knowledge Units (Pre-review proposals)
CREATE TABLE IF NOT EXISTS candidate_units (
  id TEXT PRIMARY KEY,
  cid TEXT NOT NULL,
  annotated_id TEXT,
  job_id TEXT NOT NULL REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
  source_doc_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  candidate_type TEXT NOT NULL,
  body TEXT NOT NULL,
  verbatim INTEGER NOT NULL DEFAULT 0,
  knowledge_base TEXT NOT NULL,
  owner_team TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  source_section TEXT,
  source_page INTEGER,
  effective_date TEXT NOT NULL,
  match_status TEXT NOT NULL CHECK (match_status IN ('new', 'changed', 'unchanged')),
  matched_unit_id TEXT,
  similarity REAL NOT NULL DEFAULT 0.0,
  diff_json TEXT,
  route_to TEXT NOT NULL CHECK (route_to IN ('owner', 'legal')),
  key_points_json TEXT NOT NULL DEFAULT '[]',
  selected INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER,
  version_id TEXT,
  supersedes TEXT,
  duplicate_of TEXT,
  annotations_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_candidate_units_job ON candidate_units (job_id);
CREATE INDEX IF NOT EXISTS idx_candidate_units_doc ON candidate_units (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_candidate_units_cid ON candidate_units (cid);

-- 5. Drafts (Maker-Checker Review Queue)
CREATE TABLE IF NOT EXISTS drafts (
  draft_id TEXT PRIMARY KEY,
  candidate_id TEXT,
  source_doc_id TEXT REFERENCES source_documents(id) ON DELETE SET NULL,
  unit_id TEXT NOT NULL,
  title TEXT NOT NULL,
  proposed_text TEXT NOT NULL,
  current_text TEXT,
  candidate_type TEXT NOT NULL DEFAULT 'Policy',
  verbatim INTEGER NOT NULL DEFAULT 0,
  route_to TEXT NOT NULL,
  owner_team TEXT NOT NULL,
  knowledge_base TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  proposed_by TEXT NOT NULL,
  proposer_id TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'in_review', 'approved', 'rejected', 'requested_changes')),
  reason TEXT,
  decided_by TEXT,
  gate_json TEXT,
  history_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER,
  version_id TEXT,
  supersedes TEXT,
  duplicate_of TEXT,
  annotations_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts (status);
CREATE INDEX IF NOT EXISTS idx_drafts_unit ON drafts (unit_id);
CREATE INDEX IF NOT EXISTS idx_drafts_created ON drafts (created_at DESC);

-- 6. Published Units (Authoritative Approved & Grounded Knowledge)
CREATE TABLE IF NOT EXISTS published_units (
  unit_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  verbatim INTEGER NOT NULL DEFAULT 0,
  spoken_version TEXT,
  knowledge_base TEXT NOT NULL,
  audience_json TEXT NOT NULL DEFAULT '[]',
  channels_json TEXT NOT NULL DEFAULT '[]',
  authority_level TEXT NOT NULL DEFAULT 'knowledge_article',
  source_doc TEXT NOT NULL,
  source_section TEXT NOT NULL DEFAULT 'Section 1',
  effective_date TEXT NOT NULL,
  review_date TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'stale', 'retired')),
  supersedes TEXT,
  synonyms_json TEXT NOT NULL DEFAULT '[]',
  owner TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  applies_to_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_published_units_status ON published_units (status);
CREATE INDEX IF NOT EXISTS idx_published_units_kb ON published_units (knowledge_base);
