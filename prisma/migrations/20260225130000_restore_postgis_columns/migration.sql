-- Restore PostGIS columns dropped by Prisma (not in schema, used via raw SQL)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geom to geozones if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'geozones' AND column_name = 'geom'
  ) THEN
    ALTER TABLE "geozones" ADD COLUMN "geom" geometry(Polygon, 4326);
    CREATE INDEX IF NOT EXISTS "geozone_geom_idx" ON "geozones" USING GIST ("geom");
  END IF;
END $$;

-- Add coords to geologs if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'geologs' AND column_name = 'coords'
  ) THEN
    ALTER TABLE "geologs" ADD COLUMN "coords" geometry(Point, 4326);
  END IF;
END $$;
