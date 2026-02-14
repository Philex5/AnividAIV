DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_generation_image_url'
  ) THEN
    CREATE UNIQUE INDEX uniq_generation_image_url
      ON generation_images (generation_uuid, image_url);
  END IF;
END $$;

