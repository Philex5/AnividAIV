ALTER TABLE users RENAME COLUMN is_pro TO is_sub;
ALTER TABLE users RENAME COLUMN pro_expired_at TO sub_expired_at;
ALTER TABLE users RENAME COLUMN pro_plan_type TO sub_plan_type;
