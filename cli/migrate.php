#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Database Migration Runner
 * Executes SQL migration files
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;
use Dotenv\Dotenv;

// Load environment variables
try {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
} catch (Exception $e) {
    echo "Error: .env file not found\n";
    exit(1);
}

// Database configuration
$dbConfig = require __DIR__ . '/../config/database.php';

echo "===========================================\n";
echo "  Database Migration Runner\n";
echo "===========================================\n\n";

// Parse command line arguments
$options = getopt('', ['rollback', 'fresh', 'help']);

if (isset($options['help'])) {
    showHelp();
    exit(0);
}

try {
    // Connect to database
    $db = Database::getInstance($dbConfig);
    $pdo = $db->getConnection();

    echo "✓ Connected to database: {$dbConfig['database']}\n\n";

    // Create migrations tracking table
    createMigrationsTable($pdo);

    if (isset($options['fresh'])) {
        echo "Running fresh migration (dropping all tables)...\n";
        freshMigration($pdo);
    } elseif (isset($options['rollback'])) {
        echo "Rolling back last migration batch...\n";
        rollback($pdo);
    } else {
        echo "Running pending migrations...\n";
        runMigrations($pdo);
    }

    echo "\n===========================================\n";
    echo "  Migration completed successfully!\n";
    echo "===========================================\n";

} catch (Exception $e) {
    echo "\n❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

/**
 * Create migrations tracking table
 */
function createMigrationsTable(PDO $pdo): void
{
    $sql = "CREATE TABLE IF NOT EXISTS migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL,
        batch INT UNSIGNED NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $pdo->exec($sql);
}

/**
 * Get all migration files
 */
function getMigrationFiles(): array
{
    $migrationsPath = __DIR__ . '/../migrations';
    $files = glob($migrationsPath . '/*.sql');

    sort($files);

    return $files;
}

/**
 * Get executed migrations
 */
function getExecutedMigrations(PDO $pdo): array
{
    $stmt = $pdo->query("SELECT migration FROM migrations ORDER BY migration");
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * Get current batch number
 */
function getCurrentBatch(PDO $pdo): int
{
    $stmt = $pdo->query("SELECT MAX(batch) as max_batch FROM migrations");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return (int)($result['max_batch'] ?? 0);
}

/**
 * Run pending migrations
 */
function runMigrations(PDO $pdo): void
{
    $files = getMigrationFiles();
    $executed = getExecutedMigrations($pdo);
    $batch = getCurrentBatch($pdo) + 1;
    $count = 0;

    foreach ($files as $file) {
        $filename = basename($file);

        if (in_array($filename, $executed)) {
            echo "  ⊘ Skipped: {$filename} (already executed)\n";
            continue;
        }

        echo "  ⟳ Running: {$filename}...";

        try {
            $sql = file_get_contents($file);
            $pdo->exec($sql);

            // Record migration
            $stmt = $pdo->prepare("INSERT INTO migrations (migration, batch) VALUES (?, ?)");
            $stmt->execute([$filename, $batch]);

            echo " ✓ Done\n";
            $count++;

        } catch (PDOException $e) {
            echo " ❌ Failed\n";
            throw new Exception("Migration {$filename} failed: " . $e->getMessage());
        }
    }

    if ($count === 0) {
        echo "  ℹ No pending migrations to run\n";
    } else {
        echo "\n  ✓ Executed {$count} migration(s) in batch {$batch}\n";
    }
}

/**
 * Rollback last migration batch
 */
function rollback(PDO $pdo): void
{
    $batch = getCurrentBatch($pdo);

    if ($batch === 0) {
        echo "  ℹ Nothing to rollback\n";
        return;
    }

    $stmt = $pdo->prepare("SELECT migration FROM migrations WHERE batch = ? ORDER BY id DESC");
    $stmt->execute([$batch]);
    $migrations = $stmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($migrations as $migration) {
        echo "  ⟳ Rolling back: {$migration}...\n";

        // Extract table name from migration filename
        preg_match('/create_(.+)_table\.sql/', $migration, $matches);

        if (isset($matches[1])) {
            $tableName = $matches[1];

            try {
                $pdo->exec("DROP TABLE IF EXISTS {$tableName}");
                $pdo->prepare("DELETE FROM migrations WHERE migration = ?")->execute([$migration]);
                echo "    ✓ Dropped table: {$tableName}\n";
            } catch (PDOException $e) {
                echo "    ❌ Failed to drop table: {$tableName}\n";
            }
        }
    }

    echo "\n  ✓ Rolled back batch {$batch}\n";
}

/**
 * Fresh migration (drop all tables and re-run)
 */
function freshMigration(PDO $pdo): void
{
    // Get all tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Disable foreign key checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

    foreach ($tables as $table) {
        echo "  ⟳ Dropping table: {$table}...\n";
        $pdo->exec("DROP TABLE IF EXISTS {$table}");
    }

    // Re-enable foreign key checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

    echo "\n  ✓ All tables dropped\n\n";

    // Create migrations table
    createMigrationsTable($pdo);

    // Run all migrations
    runMigrations($pdo);
}

/**
 * Show help message
 */
function showHelp(): void
{
    echo <<<HELP

Database Migration Runner

Usage:
  php cli/migrate.php [options]

Options:
  --help       Show this help message
  --rollback   Rollback the last migration batch
  --fresh      Drop all tables and re-run all migrations

Examples:
  php cli/migrate.php              Run pending migrations
  php cli/migrate.php --rollback   Rollback last batch
  php cli/migrate.php --fresh      Fresh migration (DESTRUCTIVE!)

HELP;
}
