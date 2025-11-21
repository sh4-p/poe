-- Migration: Create skill_gems table
-- Description: Stores skill gem information and stats
-- Created: 2025-11-20

CREATE TABLE IF NOT EXISTS skill_gems (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gem_color ENUM('red', 'green', 'blue', 'white') NOT NULL,
    gem_tags VARCHAR(255) NOT NULL,
    description TEXT,
    stats_json JSON NOT NULL,
    poe_version VARCHAR(20) NOT NULL,
    is_support BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_name (name),
    INDEX idx_gem_color (gem_color),
    INDEX idx_is_support (is_support),
    INDEX idx_poe_version (poe_version),
    FULLTEXT idx_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
