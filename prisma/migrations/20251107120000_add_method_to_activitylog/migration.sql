-- Add optional HTTP method column to ActivityLog
ALTER TABLE `ActivityLog`
  ADD COLUMN `method` VARCHAR(10) NULL;

