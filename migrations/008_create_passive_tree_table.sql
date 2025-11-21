-- Migration: Create passive_tree table
-- Description: Stores passive skill tree data for different PoE versions
-- Created: 2025-11-21

CREATE TABLE IF NOT EXISTS passive_tree (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    poe_version VARCHAR(20) NOT NULL,
    tree_data LONGTEXT NOT NULL COMMENT 'JSON data for passive tree',
    node_count INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_version (poe_version),
    INDEX idx_version (poe_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
