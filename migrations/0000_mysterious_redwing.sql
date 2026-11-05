CREATE TABLE `cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_id` integer NOT NULL,
	`type` text DEFAULT 'vocab' NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`ipa` text,
	`ipa_uk` text,
	`example` text,
	`example_vi` text,
	`note` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`ease` real DEFAULT 2.5 NOT NULL,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`due_at` text,
	`introduced_on` text,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "cards_type_check" CHECK("cards"."type" in ('vocab', 'grammar', 'writing', 'speaking', 'idiom', 'sound', 'sentence', 'passage')),
	CONSTRAINT "cards_ease_check" CHECK("cards"."ease" >= 1.3),
	CONSTRAINT "cards_interval_check" CHECK("cards"."interval_days" between 0 and 365)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cards_deck_type_front_key` ON `cards` (`deck_id`,`type`,`front`);--> statement-breakpoint
CREATE INDEX `cards_due_at_idx` ON `cards` (`due_at`);--> statement-breakpoint
CREATE INDEX `cards_deck_position_idx` ON `cards` (`deck_id`,`position`);--> statement-breakpoint
CREATE TABLE `decks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decks_slug_unique` ON `decks` (`slug`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`reviewed_on` text NOT NULL,
	`prev_ease` real NOT NULL,
	`prev_interval_days` integer NOT NULL,
	`prev_reps` integer NOT NULL,
	`prev_lapses` integer NOT NULL,
	`prev_due_at` text,
	`prev_introduced_on` text,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reviews_rating_check" CHECK("reviews"."rating" between 0 and 3)
);
--> statement-breakpoint
CREATE INDEX `reviews_reviewed_on_idx` ON `reviews` (`reviewed_on`);--> statement-breakpoint
CREATE INDEX `reviews_card_idx` ON `reviews` (`card_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
