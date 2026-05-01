CREATE TABLE "addon_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"addon_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"monthly_price_usd" integer DEFAULT 7 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "addon_configs_addon_type_unique" UNIQUE("addon_type")
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "affiliate_commissions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"affiliate_id" varchar(32) NOT NULL,
	"referral_id" varchar(32) NOT NULL,
	"order_id" varchar(32),
	"order_amount" integer NOT NULL,
	"commission_rate" integer NOT NULL,
	"commission_amount" integer NOT NULL,
	"currency" text DEFAULT 'USD',
	"status" text DEFAULT 'pending',
	"payout_id" varchar(32),
	"paid_at" timestamp,
	"payout_method" text,
	"payout_reference" text,
	"created_at" timestamp DEFAULT now(),
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "affiliate_payment_methods" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"affiliate_id" varchar(32) NOT NULL,
	"method_type" text NOT NULL,
	"method_name" text,
	"is_default" boolean DEFAULT false,
	"bank_name" text,
	"bank_account_number" text,
	"bank_account_name" text,
	"bank_country" text,
	"swift_code" text,
	"crypto_wallet_address" text,
	"crypto_network" text,
	"paypal_email" text,
	"paypal_account_name" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_payouts" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"affiliate_id" varchar(32) NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD',
	"payout_method" text NOT NULL,
	"payout_details" jsonb,
	"status" text DEFAULT 'pending',
	"transaction_reference" text,
	"notes" text,
	"processed_by" varchar(32),
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_referrals" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"affiliate_id" varchar(32) NOT NULL,
	"referred_merchant_id" varchar(32),
	"referred_email" text,
	"referral_code" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"landing_page" text,
	"status" text DEFAULT 'clicked',
	"clicked_at" timestamp DEFAULT now(),
	"registered_at" timestamp,
	"converted_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_withdrawal_requests" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"affiliate_id" varchar(32) NOT NULL,
	"payment_method_id" varchar(32),
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD',
	"method_type" text NOT NULL,
	"payment_details" jsonb NOT NULL,
	"status" text DEFAULT 'pending',
	"admin_notes" text,
	"rejection_reason" text,
	"processed_by" varchar(32),
	"processed_at" timestamp,
	"transaction_reference" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliates" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"affiliate_code" text NOT NULL,
	"display_name" text,
	"payout_email" text,
	"payout_method" text DEFAULT 'paypal',
	"bank_name" text,
	"bank_account_number" text,
	"bank_account_name" text,
	"total_referrals" integer DEFAULT 0,
	"successful_referrals" integer DEFAULT 0,
	"total_earnings" integer DEFAULT 0,
	"pending_earnings" integer DEFAULT 0,
	"paid_earnings" integer DEFAULT 0,
	"commission_rate" integer DEFAULT 20,
	"minimum_payout" integer DEFAULT 5000,
	"status" text DEFAULT 'pending',
	"approved_at" timestamp,
	"approved_by" varchar(32),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliates_affiliate_code_unique" UNIQUE("affiliate_code")
);
--> statement-breakpoint
CREATE TABLE "agent_supervisors" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"agent_id" varchar(32) NOT NULL,
	"supervisor_id" varchar(32) NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_type" text DEFAULT 'support',
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"photo_url" text DEFAULT '',
	"knowledge_content" text DEFAULT '',
	"system_prompt" text DEFAULT '',
	"tone_style" text DEFAULT 'formal',
	"auto_escalate_angry" boolean DEFAULT false,
	"welcome_message_enabled" boolean DEFAULT false,
	"welcome_message_text" text DEFAULT 'Halo! Ada yang bisa saya bantu?',
	"goodbye_message_enabled" boolean DEFAULT false,
	"goodbye_message_text" text DEFAULT 'Terima kasih sudah menghubungi kami!',
	"closing_statement_mode" text DEFAULT 'manual',
	"closing_statement_auto_include_business_name" boolean DEFAULT true,
	"closing_statement_auto_include_customer_name" boolean DEFAULT true,
	"inactivity_timeout_seconds" integer DEFAULT 120,
	"temperature" text DEFAULT '0.7',
	"follow_up_enabled" boolean DEFAULT false,
	"follow_up_message" text DEFAULT 'Apakah ada yang bisa saya bantu lagi?',
	"follow_up_suggestions" jsonb DEFAULT '[]'::jsonb,
	"follow_up_interval_minutes" integer DEFAULT 5,
	"is_active" boolean DEFAULT true,
	"supervisor_id" varchar(32),
	"primary_color" text DEFAULT '#6b5dfc',
	"widget_theme" text DEFAULT 'light',
	"bubble_position" text DEFAULT 'right',
	"widget_welcome_message" text DEFAULT 'Hi! How can I help you today?',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointment_divisions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"location" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointment_providers" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"division_id" varchar(32),
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointment_services" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"division_id" varchar(32),
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"price_idr" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"service_id" varchar(32),
	"provider_id" varchar(32),
	"division_id" varchar(32),
	"session_id" varchar(64),
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"customer_email" text,
	"appointment_date" text NOT NULL,
	"appointment_time" text NOT NULL,
	"end_time" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"booking_code" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_transfer_confirmations" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"plan_id" text NOT NULL,
	"plan_name" text NOT NULL,
	"billing_interval" text NOT NULL,
	"is_upgrade" boolean DEFAULT false,
	"is_downgrade" boolean DEFAULT false,
	"custom_invoice_id" varchar(32),
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"amount_idr" integer NOT NULL,
	"amount_usd" integer,
	"unique_code" text,
	"sender_bank_name" text,
	"sender_account_number" text,
	"sender_account_name" text,
	"transfer_date" timestamp,
	"proof_image_url" text,
	"status" text DEFAULT 'pending',
	"reviewed_by" varchar(32),
	"reviewed_at" timestamp,
	"review_notes" text,
	"merchant_email" text NOT NULL,
	"merchant_company_name" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_generation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"post_id" varchar(40),
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"meta_description" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"author" text DEFAULT 'Chatvice Team' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"hero_image_key" text,
	"generated_at" timestamp DEFAULT now(),
	"published_at" timestamp,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chat_buttons" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"label" text NOT NULL,
	"url" text DEFAULT '',
	"button_type" text DEFAULT 'link',
	"trigger_word" text DEFAULT '',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_logs" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"agent_id" varchar(32),
	"supervisor_id" varchar(32),
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"device_fingerprint" text,
	"bank_records" jsonb,
	"lead_status" text DEFAULT 'new',
	"location_data" jsonb,
	"summary" text NOT NULL,
	"message_count" integer DEFAULT 0,
	"full_transcript" text NOT NULL,
	"extracted_knowledge" text,
	"session_started_at" timestamp,
	"session_ended_at" timestamp,
	"cleared_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_media" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32),
	"customer_id" varchar(32),
	"uploader_id" varchar(32) NOT NULL,
	"uploader_type" text DEFAULT 'customer' NOT NULL,
	"session_id" varchar(64),
	"personal_chat_id" varchar(32),
	"message_id" varchar(32),
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_data" text NOT NULL,
	"thumbnail_data" text,
	"storage_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_security_alerts" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"supervisor_id" varchar(32),
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'medium',
	"title" text NOT NULL,
	"description" text NOT NULL,
	"suspicious_message" text NOT NULL,
	"conversation_context" text,
	"ai_analysis" text,
	"confidence_score" integer DEFAULT 50,
	"status" varchar(20) DEFAULT 'new',
	"reviewed_by" varchar(32),
	"reviewed_at" timestamp,
	"review_notes" text,
	"email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_security_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"sensitivity" integer DEFAULT 50,
	"alert_email_enabled" boolean DEFAULT true,
	"alert_emails" text[],
	"custom_patterns" text[],
	"monitor_financial_fraud" boolean DEFAULT true,
	"monitor_data_theft" boolean DEFAULT true,
	"monitor_external_contact" boolean DEFAULT true,
	"monitor_inappropriate" boolean DEFAULT true,
	"tolerate_jokes" boolean DEFAULT true,
	"tolerate_off_topic" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "chat_security_settings_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE "coin_orders" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"order_id" varchar(100) NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"site_id" varchar(32) NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"channel_requested" varchar(20) DEFAULT 'AUTO',
	"payment_type" varchar(30),
	"payment_data" jsonb,
	"gateway_ref" varchar(100),
	"status" varchar(30) DEFAULT 'PENDING',
	"current_domain" text,
	"return_url" text,
	"credited_at" timestamp,
	"paid_at" timestamp,
	"expires_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "coin_orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "crawled_links" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"knowledge_entry_id" varchar(32),
	"url" text NOT NULL,
	"title" text,
	"status" text DEFAULT 'pending',
	"extracted_content" text,
	"crawled_at" timestamp DEFAULT now(),
	"last_synced_at" timestamp,
	"sync_interval" integer DEFAULT 60,
	"is_active" boolean DEFAULT true,
	"sync_status" text DEFAULT 'idle',
	"summarized_content" text
);
--> statement-breakpoint
CREATE TABLE "crawled_products" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"source_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"title" text NOT NULL,
	"description" text DEFAULT '',
	"price" text DEFAULT '',
	"currency" text DEFAULT 'IDR',
	"image_url" text DEFAULT '',
	"product_url" text NOT NULL,
	"category" text DEFAULT '',
	"brand" text DEFAULT '',
	"sku" text DEFAULT '',
	"availability" text DEFAULT 'in_stock',
	"rating" text DEFAULT '',
	"review_count" integer DEFAULT 0,
	"specifications" jsonb DEFAULT '{}'::jsonb,
	"variants" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'pending',
	"is_active" boolean DEFAULT true,
	"crawled_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"approved_by" varchar(32),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crypto_payment_confirmations" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"plan_id" text NOT NULL,
	"plan_name" text NOT NULL,
	"billing_interval" text NOT NULL,
	"is_upgrade" boolean DEFAULT false,
	"is_downgrade" boolean DEFAULT false,
	"custom_invoice_id" varchar(32),
	"cryptocurrency" text NOT NULL,
	"network" text NOT NULL,
	"amount_usd" integer NOT NULL,
	"amount_crypto" text NOT NULL,
	"wallet_address" text NOT NULL,
	"transaction_hash" text,
	"proof_image_url" text,
	"status" text DEFAULT 'pending',
	"reviewed_by" varchar(32),
	"reviewed_at" timestamp,
	"review_notes" text,
	"merchant_email" text NOT NULL,
	"merchant_company_name" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_plan_invoices" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"invoice_number" text NOT NULL,
	"description" text,
	"conversations_limit" integer NOT NULL,
	"agents_limit" integer NOT NULL,
	"supervisors_limit" integer NOT NULL,
	"sources_limit" integer NOT NULL,
	"suggested_questions_limit" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'IDR',
	"billing_interval" text DEFAULT 'monthly',
	"payment_method" text,
	"transaction_id" text,
	"proof_image_url" text,
	"proof_submitted_at" timestamp,
	"status" text DEFAULT 'pending',
	"due_date" timestamp,
	"paid_at" timestamp,
	"created_by" varchar(32),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "custom_plan_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "custom_plan_requests" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32),
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"current_plan_id" text,
	"desired_conversations" integer,
	"desired_agents" integer,
	"desired_supervisors" integer,
	"desired_sources" integer,
	"desired_suggested_questions" integer,
	"integration_needs" text,
	"compliance_needs" text,
	"additional_features" text[],
	"additional_notes" text,
	"message" text,
	"budget_range_min" integer,
	"budget_range_max" integer,
	"expected_timeline" text,
	"status" text DEFAULT 'submitted',
	"admin_reviewer_id" varchar(32),
	"admin_notes" text,
	"proposed_monthly_price" integer,
	"proposed_annual_price" integer,
	"benchmark_multiplier" text,
	"linked_invoice_id" varchar(32),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "customer_contacts" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"customer_id" varchar(32) NOT NULL,
	"contact_customer_id" varchar(32),
	"display_name" text NOT NULL,
	"phone_number" text,
	"avatar_url" text,
	"is_favorite" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_store_chats" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"customer_id" varchar(32) NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"session_id" varchar(32),
	"last_message_at" timestamp,
	"unread_count" integer DEFAULT 0,
	"is_pinned" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_stories" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"customer_id" varchar(32),
	"merchant_id" varchar(32),
	"type" text DEFAULT 'profile_update' NOT NULL,
	"media_url" text,
	"thumbnail_url" text,
	"content" text,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"personal_id" text,
	"phone_number" text NOT NULL,
	"phone_country_code" text,
	"display_name" text,
	"avatar_url" text,
	"email" text,
	"pin_code" text,
	"is_phone_verified" boolean DEFAULT false,
	"is_profile_completed" boolean DEFAULT false,
	"last_active_at" timestamp,
	"push_subscription" jsonb,
	"notifications_enabled" boolean DEFAULT true,
	"storage_used" integer DEFAULT 0,
	"storage_limit" integer DEFAULT 52428800,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "customers_personal_id_unique" UNIQUE("personal_id"),
	CONSTRAINT "customers_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "domain_registrations" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"website_name" text NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"registered_at" timestamp DEFAULT now(),
	"source" text DEFAULT 'manual',
	CONSTRAINT "domain_registrations_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "hospitality_configs" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"hotel_name" text DEFAULT '' NOT NULL,
	"booking_url" text DEFAULT '' NOT NULL,
	"google_sheet_url" text DEFAULT '' NOT NULL,
	"sheet_last_fetched" timestamp,
	"cached_sheet_data" text,
	"ai_instructions" text DEFAULT '',
	"is_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "hospitality_configs_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"content" text NOT NULL,
	"embedding" text
);
--> statement-breakpoint
CREATE TABLE "knowledge_entries" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"name" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_linked" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_templates" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"content" text NOT NULL,
	"business_type" text,
	"language" text DEFAULT 'id',
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"created_by" varchar(32),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledgebase_articles" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tags" text[],
	"category" text,
	"status" text DEFAULT 'draft',
	"generated_by_ai" boolean DEFAULT false,
	"business_type" text,
	"business_category" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledgebase_templates" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"business_type" text NOT NULL,
	"category" text NOT NULL,
	"template_name" text NOT NULL,
	"description" text,
	"suggested_topics" text[],
	"sample_questions" text[],
	"sample_content" text,
	"icon" text DEFAULT 'FileText',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "landing_page_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"hero_background_url" text DEFAULT '',
	"hero_background_position_x" integer DEFAULT 50,
	"hero_background_position_y" integer DEFAULT -570,
	"hero_background_position_y_mobile" integer DEFAULT -150,
	"hero_content_offset_y" integer DEFAULT 70,
	"hero_content_offset_y_mobile" integer DEFAULT 160,
	"hero_date_text" text DEFAULT '09 December 2025',
	"hero_title" text DEFAULT 'Meet',
	"hero_title_highlight" text DEFAULT 'LEXA1',
	"hero_subtitle" text DEFAULT 'AI-powered customer service platform that transforms how you connect with customers.',
	"hero_primary_button_text" text DEFAULT 'Start Building Free',
	"hero_primary_button_url" text DEFAULT '/register',
	"hero_secondary_button_text" text DEFAULT 'Explore Features',
	"hero_secondary_button_url" text DEFAULT '/features',
	"running_text_content" text DEFAULT 'MEET LEXA1. THE NEXT POWERFUL AI CHATBOT.',
	"running_text_speed" integer DEFAULT 60,
	"running_text_visible" boolean DEFAULT true,
	"primary_color" text DEFAULT '#7c3aed',
	"running_text_bg_color" text DEFAULT '#7c3aed',
	"features_section_visible" boolean DEFAULT true,
	"features_section_title" text DEFAULT 'Powerful Features',
	"features_section_subtitle" text DEFAULT 'Everything you need to deliver exceptional customer service',
	"extras" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now(),
	"logo_url" text DEFAULT '',
	"favicon_url" text DEFAULT '',
	"og_image_url" text DEFAULT '',
	"meta_title" text DEFAULT 'Chatvice - AI-Powered Customer Service Platform',
	"meta_description" text DEFAULT 'Transform your customer support with Chatvice''s AI-powered chatbots. Reduce costs, improve satisfaction, and scale your customer service effortlessly.',
	"canonical_url" text DEFAULT '',
	"robots_txt" text DEFAULT 'User-agent: *
Allow: /

Sitemap: https://chatvice.com/sitemap.xml',
	"sitemap_url" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"session_id" varchar(64),
	"agent_id" varchar(32),
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"score" integer DEFAULT 0,
	"stage" text DEFAULT 'cold',
	"source" text DEFAULT 'widget',
	"interested_products" jsonb DEFAULT '[]'::jsonb,
	"notes" text DEFAULT '',
	"last_contact_at" timestamp,
	"converted_at" timestamp,
	"converted_value" integer,
	"assigned_supervisor_id" varchar(32),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_attachments" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"message_id" varchar(64),
	"type" text NOT NULL,
	"url" text NOT NULL,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchant_activity_logs" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"activity_type" text NOT NULL,
	"activity_category" text,
	"description" text NOT NULL,
	"page_url" text,
	"element_id" text,
	"element_label" text,
	"form_data" jsonb,
	"auth_method" text,
	"ip_address" text,
	"country" text,
	"country_code" text,
	"city" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchant_addons" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"addon_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"calendar_token" text,
	"subscribed_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"trial_ends_at" timestamp,
	"payment_reference" text
);
--> statement-breakpoint
CREATE TABLE "merchant_domains" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"domain" text NOT NULL,
	"is_validated" boolean DEFAULT false,
	"validated_at" timestamp,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchant_notifications" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_entity_type" text,
	"related_entity_id" varchar(32),
	"action_url" text,
	"action_label" text,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchant_payment_methods" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"type" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"nickname" text,
	"card_number" text,
	"card_number_encrypted" text,
	"card_holder_name" text,
	"card_expiry_month" text,
	"card_expiry_year" text,
	"card_cvv_encrypted" text,
	"card_brand" text,
	"bank_name" text,
	"bank_account_number" text,
	"bank_account_name" text,
	"bank_swift_code" text,
	"bank_country" text,
	"ewallet_provider" text,
	"ewallet_phone_number" text,
	"crypto_network" text,
	"crypto_wallet_address" text,
	"paypal_email" text,
	"va_provider" text,
	"va_number" text,
	"last_used_at" timestamp,
	"times_used" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"username" text,
	"company_name" text,
	"official_website_name" text,
	"official_domain" text,
	"profile_completed" boolean DEFAULT false,
	"profile_step" integer DEFAULT 0,
	"phone_country_code" text,
	"icon_url" text DEFAULT '',
	"icon_visible" boolean DEFAULT true,
	"icon_size" integer DEFAULT 70,
	"icon_width" integer,
	"icon_height" integer,
	"use_custom_icon_dimensions" boolean DEFAULT false,
	"mobile_icon_width" integer,
	"mobile_icon_height" integer,
	"widget_offset" integer DEFAULT 20,
	"icon_animation_vertical" boolean DEFAULT false,
	"icon_animation_horizontal" boolean DEFAULT false,
	"icon_animation_zoom" boolean DEFAULT false,
	"icon_animation_rotation" boolean DEFAULT false,
	"icon_animation_speed" integer DEFAULT 3,
	"online" boolean DEFAULT true,
	"primary_color" text DEFAULT '#6b5dfc',
	"welcome_message" text DEFAULT 'Hi! How can I help you today?',
	"profile_photo_url" text DEFAULT '',
	"agent_name" text DEFAULT 'Chatvice',
	"agent_photo_url" text DEFAULT '',
	"widget_theme" text DEFAULT 'light',
	"bubble_position" text DEFAULT 'right',
	"payment_customer_id" text,
	"payment_subscription_id" text,
	"payment_provider" text DEFAULT '12pay',
	"last_invoice_id" text,
	"pending_transaction_id" text,
	"subscription_status" text DEFAULT 'trial',
	"subscription_plan_id" text DEFAULT 'free',
	"trial_ends_at" timestamp,
	"current_period_end" timestamp,
	"billing_interval" text DEFAULT 'monthly',
	"conversations_used" integer DEFAULT 0,
	"conversations_reset_at" timestamp,
	"bg_removal_used" integer DEFAULT 0,
	"bg_removal_reset_at" timestamp,
	"identity_secret_key" text,
	"allowed_domains" text DEFAULT '',
	"chat_timeout" integer DEFAULT 300,
	"rate_limit_messages" integer DEFAULT 30,
	"rate_limit_window" integer DEFAULT 60,
	"custom_domain" text DEFAULT '',
	"custom_domain_status" text DEFAULT 'pending',
	"collect_customer_email" boolean DEFAULT false,
	"collect_customer_phone" boolean DEFAULT false,
	"active_agent_id" varchar(32),
	"custom_conversations_limit" integer,
	"custom_agents_limit" integer,
	"custom_supervisors_limit" integer,
	"custom_sources_limit" integer,
	"custom_suggested_questions_limit" integer,
	"custom_monthly_price" integer,
	"custom_annual_price" integer,
	"scheduled_plan_id" text,
	"scheduled_billing_interval" text,
	"scheduled_plan_activates_at" timestamp,
	"scheduled_plan_transaction_id" text,
	"website_url" text DEFAULT '',
	"pic_name" text DEFAULT '',
	"phone" text DEFAULT '',
	"country" text DEFAULT '',
	"city" text DEFAULT '',
	"region" text DEFAULT '',
	"is_email_verified" boolean DEFAULT false,
	"email_verified_at" timestamp,
	"google_id" text,
	"github_id" text,
	"business_category" text,
	"staff_count" text,
	"social_media_enabled" boolean DEFAULT false,
	"social_icon_style" text DEFAULT 'colored',
	"social_instagram" text,
	"social_facebook" text,
	"social_telegram" text,
	"social_whatsapp" text,
	"social_discord" text,
	"social_use_custom_icons" boolean DEFAULT false,
	"social_custom_instagram" text,
	"social_custom_facebook" text,
	"social_custom_telegram" text,
	"social_custom_whatsapp" text,
	"social_custom_discord" text,
	"welcome_description" text DEFAULT '',
	"prechat_banner_url" text DEFAULT '',
	"quick_message_options" text[] DEFAULT '{}',
	"chat_workflow" text DEFAULT 'click_to_open',
	"pending_email" text,
	"email_change_otp" text,
	"email_change_otp_expires_at" timestamp,
	"widget_slug" text,
	"work_timezone" text DEFAULT 'Asia/Jakarta',
	"proactive_chat_enabled" boolean DEFAULT false,
	"proactive_chat_greeting_delay" integer DEFAULT 8,
	"proactive_chat_ding_enabled" boolean DEFAULT false,
	"proactive_chat_templates" text[] DEFAULT '{}',
	"storage_used" integer DEFAULT 0,
	"storage_limit" integer DEFAULT 104857600,
	"quota80_email_sent" boolean DEFAULT false,
	"quota100_email_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"first_subscribed_at" timestamp,
	"registration_ip" text,
	"registration_country" text,
	"last_login_ip" text,
	"last_login_country" text,
	CONSTRAINT "merchants_email_unique" UNIQUE("email"),
	CONSTRAINT "merchants_widget_slug_unique" UNIQUE("widget_slug")
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"message_id" varchar(64) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"reaction_type" text NOT NULL,
	"reacted_by" text NOT NULL,
	"reacted_by_role" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"from" text NOT NULL,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text',
	"payload" jsonb,
	"client_message_id" varchar(64),
	"location_data" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messaging_bridge_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"supervisor_id" varchar(32) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"channel" text NOT NULL,
	"anchor_message_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"incoming_chat_sound" text DEFAULT 'default',
	"incoming_chat_enabled" boolean DEFAULT true,
	"chat_reply_sound" text DEFAULT 'default',
	"chat_reply_enabled" boolean DEFAULT true,
	"angry_customer_sound" text DEFAULT 'alert',
	"angry_customer_enabled" boolean DEFAULT true,
	"custom_sounds" jsonb DEFAULT '[]'::jsonb,
	"browser_push_enabled" boolean DEFAULT false,
	"telegram_enabled" boolean DEFAULT false,
	"telegram_bot_token" text,
	"telegram_chat_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_settings_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"supervisor_id" varchar(32) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"message" text NOT NULL,
	"seen" boolean DEFAULT false,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"is_default" boolean DEFAULT false,
	"environment" varchar(20) DEFAULT 'sandbox',
	"dashboard_url" text,
	"config" jsonb DEFAULT '{}'::jsonb,
	"client_key_env_var" text,
	"client_secret_env_var" text,
	"supported_methods" text[],
	"fee_percentage" integer DEFAULT 0,
	"fee_fixed" integer DEFAULT 0,
	"currency" varchar(10) DEFAULT 'IDR',
	"description" text,
	"icon_url" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"gateway_id" varchar(32),
	"gateway_name" text,
	"external_id" text,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'IDR',
	"status" varchar(20) DEFAULT 'pending',
	"payment_method" text,
	"plan_id" varchar(32),
	"plan_name" text,
	"subscription_months" integer DEFAULT 1,
	"merchant_email" text,
	"merchant_company_name" text,
	"gateway_response" jsonb DEFAULT '{}'::jsonb,
	"qris_url" text,
	"paid_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"receipt_sent_at" timestamp,
	"invoice_number" text
);
--> statement-breakpoint
CREATE TABLE "personal_chats" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"participant1_id" varchar(32) NOT NULL,
	"participant2_id" varchar(32) NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "personal_messages" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"chat_id" varchar(32) NOT NULL,
	"sender_id" varchar(32) NOT NULL,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text',
	"file_url" text,
	"file_name" text,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_dns_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"platform_domain" text DEFAULT 'chatvice.com',
	"widget_subdomain" text DEFAULT 'widget.chatvice.com',
	"ns_primary" text DEFAULT 'ns1.chatvice-dns.com',
	"ns_secondary" text DEFAULT 'ns2.chatvice-dns.com',
	"dns_ttl" integer DEFAULT 3600,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "product_card_buttons" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"card_id" varchar(32) NOT NULL,
	"label" text NOT NULL,
	"url" text DEFAULT '',
	"button_type" text DEFAULT 'link',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_cards" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"title" text NOT NULL,
	"description" text DEFAULT '',
	"image_url" text DEFAULT '',
	"source_url" text DEFAULT '',
	"price" text DEFAULT '',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_crawl_sources" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"url" text NOT NULL,
	"name" text DEFAULT '',
	"source_type" text DEFAULT 'product_page',
	"last_crawled_at" timestamp,
	"crawl_frequency" text DEFAULT 'manual',
	"total_products" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_recommendation_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"ai_auto_recommend_enabled" boolean DEFAULT true,
	"trigger_keywords" text DEFAULT 'product,recommend,buy,shop,item,catalog',
	"ai_context_trigger_enabled" boolean DEFAULT true,
	"supervisor_can_recommend" boolean DEFAULT true,
	"max_products_per_recommendation" integer DEFAULT 3,
	"show_price_in_recommendation" boolean DEFAULT true,
	"cta_button_enabled" boolean DEFAULT true,
	"cta_button_text" text DEFAULT 'View',
	"cta_button_color" text DEFAULT '#6b5dfc',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "product_recommendation_settings_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE "product_triggers" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"product_card_id" varchar(32) NOT NULL,
	"keywords" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotion_usage" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"promotion_id" varchar(32) NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"plan_id" varchar(32) NOT NULL,
	"original_price" integer NOT NULL,
	"discounted_price" integer NOT NULL,
	"discount_amount" integer NOT NULL,
	"billing_cycle" varchar(20) NOT NULL,
	"used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"discount_percent" integer NOT NULL,
	"target_plans" text[] NOT NULL,
	"billing_cycle" varchar(20) DEFAULT 'both',
	"max_uses" integer,
	"used_count" integer DEFAULT 0,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_public" boolean DEFAULT false,
	"show_upsell" boolean DEFAULT true,
	"bg_color" varchar(50) DEFAULT '#16a34a',
	"text_color" varchar(50) DEFAULT '#ffffff',
	"banner_mode" varchar(20) DEFAULT 'color',
	"banner_image_url" text,
	"banner_image_mobile_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "promotions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "provider_blocked_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" varchar(32) NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"blocked_date" text NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "provider_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" varchar(32) NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"break_start" text,
	"break_end" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quick_replies" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"shortcut" text NOT NULL,
	"label" text NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'general',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"mode" text DEFAULT 'AI' NOT NULL,
	"supervisor_id" varchar(32),
	"agent_id" varchar(32),
	"customer_name" text DEFAULT 'Customer',
	"customer_email" text,
	"customer_phone" text,
	"customer_avatar_url" text,
	"bank_records" jsonb,
	"lead_status" text DEFAULT 'new',
	"last_activity" timestamp DEFAULT now(),
	"needs_supervisor_attention" boolean DEFAULT false,
	"status" text DEFAULT 'active',
	"planned_clear_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"device_fingerprint" text,
	"client_ip" text,
	"visitor_session" boolean DEFAULT false,
	"proactive_greeting_sent" boolean DEFAULT false,
	"country_code" text,
	"country_name" text,
	"city_name" text,
	"page_url" text,
	"user_agent" text,
	"customer_rating" integer,
	"rating_comment" text,
	"rated_at" timestamp,
	"limit_fallback" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"shift_id" varchar(32) NOT NULL,
	"assignee_id" varchar(32) NOT NULL,
	"assignee_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_domains" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"site_id" varchar(32) NOT NULL,
	"domain" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now(),
	"is_current" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"type" text NOT NULL,
	"name" text NOT NULL,
	"content" text DEFAULT '',
	"url" text DEFAULT '',
	"is_active" boolean DEFAULT true,
	"sync_enabled" boolean DEFAULT true,
	"last_synced_at" timestamp,
	"sync_status" text DEFAULT 'idle',
	"source_subtype" text,
	"sync_interval" integer DEFAULT 60,
	"char_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stored_files" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'brand',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suggested_questions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"agent_id" varchar(32),
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supervisor_invitations" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending',
	"invited_by_id" varchar(32) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "supervisors" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"photo_url" text DEFAULT '',
	"role" text DEFAULT 'supervisor',
	"status" text DEFAULT 'offline',
	"last_seen" timestamp,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"invited_by_id" varchar(32),
	"telegram_chat_id" text
);
--> statement-breakpoint
CREATE TABLE "topup_nominals" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"site_id" varchar(32) NOT NULL,
	"amount" integer NOT NULL,
	"coins_given" integer NOT NULL,
	"bonus_coins" integer DEFAULT 0,
	"label" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "triggers" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"keyword" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unknown_domain_attempts" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"domain" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now(),
	"attempt_count" integer DEFAULT 1,
	"is_ignored" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "welcome_bubbles" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"headline" text DEFAULT 'Need help?',
	"message" text DEFAULT 'I can guide you through our features.',
	"button_label" text DEFAULT 'Chat with us',
	"button_color" text DEFAULT '#7c3aed',
	"button_text_color" text DEFAULT '#ffffff',
	"promo_image_enabled" boolean DEFAULT false,
	"promo_image_url" text DEFAULT '',
	"reappear_interval" integer DEFAULT 60,
	"is_enabled" boolean DEFAULT true,
	"action_buttons" jsonb DEFAULT '[]'::jsonb,
	"social_icons_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "welcome_bubbles_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE "widget_sites" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"site_code" varchar(20) NOT NULL,
	"site_key" varchar(64) NOT NULL,
	"site_name" text NOT NULL,
	"coin_api_base_url" text,
	"coin_api_secret" text,
	"is_topup_enabled" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "widget_sites_site_code_unique" UNIQUE("site_code"),
	CONSTRAINT "widget_sites_site_key_unique" UNIQUE("site_key")
);
--> statement-breakpoint
CREATE TABLE "work_reports" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"assignee_id" varchar(32) NOT NULL,
	"assignee_type" text NOT NULL,
	"date" timestamp NOT NULL,
	"clock_in" timestamp,
	"clock_out" timestamp,
	"hours_worked" integer DEFAULT 0,
	"minutes_worked" integer DEFAULT 0,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_shifts" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"merchant_id" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"day_type" text DEFAULT 'weekday' NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_night_shift" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "appt_div_merchant_idx" ON "appointment_divisions" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "appt_prov_merchant_idx" ON "appointment_providers" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "appt_prov_division_idx" ON "appointment_providers" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "appt_svc_merchant_idx" ON "appointment_services" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "appt_merchant_idx" ON "appointments" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "appt_date_idx" ON "appointments" USING btree ("appointment_date");--> statement-breakpoint
CREATE INDEX "appt_provider_idx" ON "appointments" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "appt_session_idx" ON "appointments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "appt_booking_code_idx" ON "appointments" USING btree ("booking_code");--> statement-breakpoint
CREATE UNIQUE INDEX "appt_provider_slot_uniq_idx" ON "appointments" USING btree ("provider_id","appointment_date","appointment_time");--> statement-breakpoint
CREATE INDEX "blog_gen_date_idx" ON "blog_generation_logs" USING btree ("date");--> statement-breakpoint
CREATE INDEX "blog_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_category_idx" ON "blog_posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "blog_published_idx" ON "blog_posts" USING btree ("published");--> statement-breakpoint
CREATE INDEX "chat_media_uploader_idx" ON "chat_media" USING btree ("uploader_id");--> statement-breakpoint
CREATE INDEX "chat_media_session_idx" ON "chat_media" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "chat_media_personal_chat_idx" ON "chat_media" USING btree ("personal_chat_id");--> statement-breakpoint
CREATE INDEX "chat_media_merchant_idx" ON "chat_media" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "chat_media_customer_idx" ON "chat_media" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "contact_customer_idx" ON "customer_contacts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "store_chat_customer_idx" ON "customer_store_chats" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "store_chat_merchant_idx" ON "customer_store_chats" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "story_customer_idx" ON "customer_stories" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "story_merchant_idx" ON "customer_stories" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "story_expires_idx" ON "customer_stories" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customers" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "customer_personal_id_idx" ON "customers" USING btree ("personal_id");--> statement-breakpoint
CREATE INDEX "hosp_merchant_idx" ON "hospitality_configs" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "knowledge_merchant_id_idx" ON "knowledge" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "knowledge_agent_id_idx" ON "knowledge" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_merchant_id_idx" ON "knowledge_chunks" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_agent_id_idx" ON "knowledge_chunks" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "knowledge_entries_merchant_id_idx" ON "knowledge_entries" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "knowledge_entries_agent_id_idx" ON "knowledge_entries" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "leads_merchant_id_idx" ON "leads" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "leads_stage_idx" ON "leads" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "leads_score_idx" ON "leads" USING btree ("score");--> statement-breakpoint
CREATE INDEX "activity_merchant_id_idx" ON "merchant_activity_logs" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "activity_type_idx" ON "merchant_activity_logs" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "activity_created_at_idx" ON "merchant_activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "merchant_addons_merchant_idx" ON "merchant_addons" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "merchant_addons_type_idx" ON "merchant_addons" USING btree ("addon_type");--> statement-breakpoint
CREATE INDEX "merchant_addons_cal_token_idx" ON "merchant_addons" USING btree ("calendar_token");--> statement-breakpoint
CREATE INDEX "reactions_message_id_idx" ON "message_reactions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "reactions_session_id_idx" ON "message_reactions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "messages_session_id_idx" ON "messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "messages_timestamp_idx" ON "messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "mbs_session_idx" ON "messaging_bridge_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "mbs_anchor_idx" ON "messaging_bridge_sessions" USING btree ("anchor_message_id","channel");--> statement-breakpoint
CREATE INDEX "otp_phone_idx" ON "otp_codes" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "otp_expires_idx" ON "otp_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "personal_chat_p1_idx" ON "personal_chats" USING btree ("participant1_id");--> statement-breakpoint
CREATE INDEX "personal_chat_p2_idx" ON "personal_chats" USING btree ("participant2_id");--> statement-breakpoint
CREATE INDEX "personal_msg_chat_idx" ON "personal_messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "personal_msg_sender_idx" ON "personal_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "prov_blocked_provider_idx" ON "provider_blocked_dates" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "prov_sched_provider_idx" ON "provider_schedules" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "sessions_merchant_id_idx" ON "sessions" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "sessions_created_at_idx" ON "sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_device_fingerprint_idx" ON "sessions" USING btree ("device_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "unknown_domain_attempts_merchant_domain_unique" ON "unknown_domain_attempts" USING btree ("merchant_id","domain");