-- Migration: Create build_data table
-- Description: Stores build configuration data as JSON
-- Created: 2025-11-20

CREATE TABLE IF NOT EXISTS build_data (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    build_id INT UNSIGNED NOT NULL,
    data_type ENUM('passive_tree', 'items', 'skills', 'gems', 'jewels', 'flasks') NOT NULL,
    json_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE,

    INDEX idx_build_id (build_id),
    INDEX idx_data_type (data_type),
    UNIQUE KEY unique_build_data_type (build_id, data_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
