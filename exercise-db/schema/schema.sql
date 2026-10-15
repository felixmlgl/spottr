-- Provenance
CREATE TABLE sources (
  id                TEXT PRIMARY KEY,          -- 'free-exercise-db', 'wger'
  name              TEXT NOT NULL,
  url               TEXT NOT NULL,
  license           TEXT NOT NULL,             -- SPDX id, e.g. 'Unlicense', 'CC-BY-SA-4.0'
  license_url       TEXT,
  attribution       TEXT,                      -- text we must display, if any
  share_alike       INTEGER NOT NULL DEFAULT 0 CHECK (share_alike IN (0,1)),
  commercial_use_ok INTEGER NOT NULL CHECK (commercial_use_ok IN (0,1)),
  retrieved_at      TEXT NOT NULL,             -- ISO-8601, from the snapshot
  version           TEXT                       -- commit SHA / API version
);

-- Two-level muscle taxonomy: groups (chest) and specific muscles (pectoralis_major_sternal)
CREATE TABLE muscles (
  id         TEXT PRIMARY KEY,
  level      TEXT NOT NULL CHECK (level IN ('group','muscle')),
  parent_id  TEXT REFERENCES muscles(id),      -- NULL for groups, group id for muscles
  name_en    TEXT NOT NULL,
  name_de    TEXT NOT NULL,
  latin_name TEXT,
  region     TEXT NOT NULL CHECK (region IN ('upper','lower','core')),
  body_view  TEXT CHECK (body_view IN ('front','back','both'))
);

CREATE TABLE muscle_aliases (                  -- raw muscle names from sources -> canonical muscle
  source_id TEXT NOT NULL REFERENCES sources(id),
  alias     TEXT NOT NULL,                     -- lowercased raw name as found in the source
  muscle_id TEXT NOT NULL REFERENCES muscles(id),
  PRIMARY KEY (source_id, alias)
);

CREATE TABLE equipment (
  id      TEXT PRIMARY KEY,                    -- 'barbell','dumbbell','cable','machine','bodyweight',...
  name_en TEXT NOT NULL,
  name_de TEXT NOT NULL
);

CREATE TABLE exercises (
  id                     TEXT PRIMARY KEY,     -- permanent slug, e.g. 'barbell-bench-press'
  name_en                TEXT NOT NULL,
  name_de                TEXT,
  category               TEXT NOT NULL CHECK (category IN
                           ('strength','stretching','mobility','cardio','plyometrics','olympic','strongman','other')),
  movement_pattern       TEXT CHECK (movement_pattern IN
                           ('squat','hinge','lunge','horizontal_push','vertical_push','horizontal_pull',
                            'vertical_pull','elbow_flexion','elbow_extension','carry','rotation',
                            'anti_rotation','isolation_other','locomotion','other')),
  mechanic               TEXT CHECK (mechanic IN ('compound','isolation')),
  force                  TEXT CHECK (force IN ('push','pull','static','other')),
  laterality             TEXT CHECK (laterality IN ('bilateral','unilateral','alternating')),
  level                  TEXT CHECK (level IN ('beginner','intermediate','advanced')),
  variation_of           TEXT REFERENCES exercises(id),   -- incline-dumbbell-press -> dumbbell-bench-press
  instructions           TEXT,                            -- JSON array of steps
  instructions_source_id TEXT REFERENCES sources(id),
  needs_review           INTEGER NOT NULL DEFAULT 0 CHECK (needs_review IN (0,1))
);

CREATE TABLE exercise_equipment (
  exercise_id  TEXT NOT NULL REFERENCES exercises(id),
  equipment_id TEXT NOT NULL REFERENCES equipment(id),
  PRIMARY KEY (exercise_id, equipment_id)
);

CREATE TABLE exercise_aliases (                -- search names, translations, vision-pipeline labels
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  alias       TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('name','abbreviation','translation','source_name','pipeline_label')),
  lang        TEXT,                            -- 'en','de'; NULL for pipeline labels
  source_id   TEXT REFERENCES sources(id),
  PRIMARY KEY (exercise_id, alias, kind)
);
CREATE UNIQUE INDEX ux_pipeline_label ON exercise_aliases(alias) WHERE kind = 'pipeline_label';

-- Raw evidence: one row per source record, never edited by hand
CREATE TABLE source_records (
  source_id        TEXT NOT NULL REFERENCES sources(id),
  source_record_id TEXT NOT NULL,
  exercise_id      TEXT REFERENCES exercises(id),
  source_url       TEXT,
  license          TEXT,                       -- per-record license if the source varies (wger)
  author           TEXT,
  match_method     TEXT CHECK (match_method IN ('exact','normalized','fuzzy','manual','new')),
  match_score      REAL,
  raw_json         TEXT NOT NULL,
  PRIMARY KEY (source_id, source_record_id)
);
CREATE INDEX ix_source_records_exercise ON source_records(exercise_id);

CREATE TABLE exercise_muscle_evidence (        -- what each source claims
  source_id        TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  muscle_id        TEXT NOT NULL REFERENCES muscles(id),
  role             TEXT NOT NULL CHECK (role IN ('primary','secondary','stabilizer')),
  raw_muscle_name  TEXT NOT NULL,
  PRIMARY KEY (source_id, source_record_id, muscle_id, role),
  FOREIGN KEY (source_id, source_record_id) REFERENCES source_records(source_id, source_record_id)
);

CREATE TABLE exercise_muscles (                -- resolved; this is what the app reads
  exercise_id  TEXT NOT NULL REFERENCES exercises(id),
  muscle_id    TEXT NOT NULL REFERENCES muscles(id),
  role         TEXT NOT NULL CHECK (role IN ('primary','secondary','stabilizer')),
  weight       REAL NOT NULL,                  -- for volume per muscle: 1.0 / 0.5 / 0.25 by default
  source_count INTEGER NOT NULL,
  confidence   REAL NOT NULL,                  -- 0..1, share of covering sources that agree
  PRIMARY KEY (exercise_id, muscle_id)
);
CREATE INDEX ix_exercise_muscles_muscle ON exercise_muscles(muscle_id);

-- Group-level view for the app (volume per muscle group)
CREATE VIEW exercise_muscle_groups AS
SELECT em.exercise_id,
       COALESCE(m.parent_id, m.id) AS group_id,
       MAX(em.weight)              AS weight,
       MIN(CASE em.role WHEN 'primary' THEN 1 WHEN 'secondary' THEN 2 ELSE 3 END) AS role_rank
FROM exercise_muscles em
JOIN muscles m ON m.id = em.muscle_id
GROUP BY em.exercise_id, COALESCE(m.parent_id, m.id);

-- Extension: start and end position image per exercise (added after the initial schema).
-- Image files are not stored in the database or in git. `path` is relative to the media root
-- (exercise-db/media/ after `make fetch-media`), `source_url` is where the file was downloaded from.
CREATE TABLE exercise_images (
  exercise_id      TEXT NOT NULL REFERENCES exercises(id),
  position         TEXT NOT NULL CHECK (position IN ('start','end')),
  source_id        TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  path             TEXT NOT NULL,
  source_url       TEXT NOT NULL,
  license          TEXT NOT NULL,
  author           TEXT,
  sha256           TEXT,
  PRIMARY KEY (exercise_id, position),
  FOREIGN KEY (source_id, source_record_id) REFERENCES source_records(source_id, source_record_id)
);
