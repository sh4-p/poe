-- Migration: Create uniques table
-- Description: Stores unique item information
-- Created: 2025-11-20

CREATE TABLE IF NOT EXISTS uniques (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_item VARCHAR(100) NOT NULL,
    inventory_icon VARCHAR(255),
    stats_json JSON NOT NULL,
    poe_version VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_name (name),
    INDEX idx_base_item (base_item),
    INDEX idx_poe_version (poe_version),
    FULLTEXT idx_search (name, base_item)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
