-- GEO Scanner: geo_scans, geo_pages, geo_issues, geo_fixes_applied
-- site_id references analytics_sites(id) (text)

CREATE TABLE IF NOT EXISTS geo_scans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id text NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
  url text NOT NULL,
  overall_score integer NOT NULL DEFAULT 0,
  crawl_score integer NOT NULL DEFAULT 0,
  structure_score integer NOT NULL DEFAULT 0,
  entity_score integer NOT NULL DEFAULT 0,
  schema_score integer NOT NULL DEFAULT 0,
  reference_score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS geo_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  geo_scan_id uuid NOT NULL REFERENCES geo_scans(id) ON DELETE CASCADE,
  url text NOT NULL,
  html_size integer,
  word_count integer,
  h1 text,
  h2_count integer,
  schema_types jsonb,
  issues_count integer DEFAULT 0,
  page_score integer
);

CREATE TABLE IF NOT EXISTS geo_issues (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  geo_scan_id uuid NOT NULL REFERENCES geo_scans(id) ON DELETE CASCADE,
  page_url text NOT NULL,
  category text NOT NULL CHECK (category IN ('crawl', 'structure', 'entity', 'schema', 'reference')),
  code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'med', 'high')),
  title text NOT NULL,
  description text,
  fix_type text NOT NULL CHECK (fix_type IN ('copy', 'code', 'page_create')),
  fix_payload jsonb
);

CREATE TABLE IF NOT EXISTS geo_fixes_applied (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  geo_issue_id uuid NOT NULL REFERENCES geo_issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applied_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_geo_scans_site_created ON geo_scans (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_pages_scan ON geo_pages (geo_scan_id);
CREATE INDEX IF NOT EXISTS idx_geo_issues_scan_category ON geo_issues (geo_scan_id, category);
CREATE INDEX IF NOT EXISTS idx_geo_fixes_applied_issue ON geo_fixes_applied (geo_issue_id);

-- RLS
ALTER TABLE geo_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_fixes_applied ENABLE ROW LEVEL SECURITY;

-- geo_scans: allow insert for anyone (align with anonymous scan flow); allow select for public for now (report by scanId)
CREATE POLICY "Allow public insert geo_scans" ON geo_scans FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public read geo_scans" ON geo_scans FOR SELECT TO public USING (true);

-- geo_pages: allow access when scan is accessible
CREATE POLICY "Allow public read geo_pages" ON geo_pages FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert geo_pages" ON geo_pages FOR INSERT TO public WITH CHECK (true);

-- geo_issues: same
CREATE POLICY "Allow public read geo_issues" ON geo_issues FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert geo_issues" ON geo_issues FOR INSERT TO public WITH CHECK (true);

-- geo_fixes_applied: users insert/select own rows
CREATE POLICY "Users insert own geo_fixes_applied" ON geo_fixes_applied FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own geo_fixes_applied" ON geo_fixes_applied FOR SELECT TO authenticated USING (auth.uid() = user_id);
