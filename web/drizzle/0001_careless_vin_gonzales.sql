CREATE INDEX `idx_community_posts_created_at` ON `community_posts` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_demand_requests_created_at` ON `demand_requests` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_drops_shop_expires` ON `drops` (`shop_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_reservations_customer_id` ON `reservations` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_reservations_drop_id` ON `reservations` (`drop_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_shops_owner_id` ON `shops` (`owner_id`);