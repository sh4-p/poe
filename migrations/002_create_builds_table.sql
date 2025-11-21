-- Migration: Create builds table
-- Description: Stores user build information
-- Created: 2025-11-20

CREATE TABLE IF NOT EXISTS builds (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    build_name VARCHAR(100) NOT NULL,
    ascendancy_class VARCHAR(50) NOT NULL,
    poe_version VARCHAR(20) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_user_id (user_id),
    INDEX idx_public (is_public),
    INDEX idx_created_at (created_at),
    INDEX idx_ascendancy (ascendancy_class)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
