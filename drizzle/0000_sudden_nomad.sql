CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`level` integer NOT NULL,
	`title` text NOT NULL,
	`theme` text NOT NULL,
	`locked` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`word_id` text NOT NULL,
	`rating` text NOT NULL,
	`quiz_type` text NOT NULL,
	`correct` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_progress` (
	`user_id` text NOT NULL,
	`word_id` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`due_at` text,
	`last_rating` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_progress_word_idx` ON `user_progress` (`user_id`,`word_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`daily_goal` integer DEFAULT 10 NOT NULL,
	`active_level` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vocabulary_words` (
	`id` text PRIMARY KEY NOT NULL,
	`hanzi` text NOT NULL,
	`pinyin` text NOT NULL,
	`french` text,
	`level` integer NOT NULL,
	`theme` text,
	`source_url` text NOT NULL,
	`source_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vocabulary_hanzi_level_idx` ON `vocabulary_words` (`hanzi`,`level`);