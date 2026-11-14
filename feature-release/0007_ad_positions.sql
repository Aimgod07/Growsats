ALTER TABLE ad_placements ADD COLUMN position TEXT NOT NULL DEFAULT 'top' CHECK (position IN ('top','middle','bottom'));
