-- path: electron/db/migrations/0002_add_date_cols.sql
ALTER TABLE template_boxes ADD COLUMN date_format TEXT;
ALTER TABLE template_boxes ADD COLUMN date_digit_index INTEGER;
