CREATE TABLE `interledger_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`order_reference` text NOT NULL,
	`amount_value` text NOT NULL,
	`asset_code` text DEFAULT 'ZAR' NOT NULL,
	`asset_scale` integer DEFAULT 2 NOT NULL,
	`sender_wallet` text NOT NULL,
	`receiver_wallet` text NOT NULL,
	`incoming_payment_url` text,
	`quote_url` text,
	`outgoing_payment_url` text,
	`auth_server` text,
	`continue_uri` text,
	`continue_token` text,
	`client_nonce` text,
	`interact_nonce` text,
	`status` text DEFAULT 'starting' NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_interledger_payments_user_id` ON `interledger_payments` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interledger_payments_order_reference` ON `interledger_payments` (`order_reference`);
