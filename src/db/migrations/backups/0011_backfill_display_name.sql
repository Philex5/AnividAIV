UPDATE users
SET display_name = nickname
WHERE (display_name IS NULL OR BTRIM(display_name) = '')
  AND nickname IS NOT NULL
  AND BTRIM(nickname) <> '';
