-- Migration: Create base_items table
-- Description: Stores base item types and their properties
-- Created: 2025-11-20

CREATE TABLE IF NOT EXISTS base_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    item_class VARCHAR(50) NOT NULL,
    item_level INT UNSIGNED NOT NULL DEFAULT 1,
    drop_level INT UNSIGNED NOT NULL DEFAULT 1,
    stats_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_name (name),
    INDEX idx_item_class (item_class),
    INDEX idx_item_level (item_level),
    FULLTEXT idx_search (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
