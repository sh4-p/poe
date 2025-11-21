<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;
use PDOStatement;

/**
 * Database Connection Manager (Singleton Pattern)
 * Handles all database operations using PDO
 */
class Database
{
    private static ?Database $instance = null;
    private ?PDO $connection = null;
    private array $config;

    /**
     * Private constructor (Singleton)
     */
    private function __construct(array $config)
    {
        $this->config = $config;
        $this->connect();
    }

    /**
     * Get database instance
     */
    public static function getInstance(array $config = []): self
    {
        if (self::$instance === null) {
            self::$instance = new self($config);
        }

        return self::$instance;
    }

    /**
     * Establish database connection
     */
    private function connect(): void
    {
        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                $this->config['host'],
                $this->config['port'],
                $this->config['database']
            );

            $this->connection = new PDO(
                $dsn,
                $this->config['username'],
                $this->config['password'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ]
            );
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new \RuntimeException("Could not connect to database");
        }
    }

    /**
     * Get PDO connection
     */
    public function getConnection(): PDO
    {
        return $this->connection;
    }

    /**
     * Execute query with parameters
     */
    public function query(string $sql, array $params = []): PDOStatement
    {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Query failed: " . $e->getMessage() . " | SQL: " . $sql);
            throw $e;
        }
    }

    /**
     * Fetch all rows
     */
    public function fetchAll(string $sql, array $params = []): array
    {
        return $this->query($sql, $params)->fetchAll();
    }

    /**
     * Fetch single row
     */
    public function fetchOne(string $sql, array $params = []): ?array
    {
        $result = $this->query($sql, $params)->fetch();
        return $result ?: null;
    }

    /**
     * Execute insert/update/delete
     */
    public function execute(string $sql, array $params = []): bool
    {
        return $this->query($sql, $params)->rowCount() > 0;
    }

    /**
     * Insert and return last insert ID
     */
    public function insert(string $table, array $data): int
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));

        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";

        $this->query($sql, array_values($data));

        return (int) $this->connection->lastInsertId();
    }

    /**
     * Update records
     */
    public function update(string $table, array $data, string $where, array $whereParams = []): bool
    {
        $set = [];
        $values = [];

        foreach ($data as $key => $value) {
            $set[] = "{$key} = ?";
            $values[] = $value;
        }

        $sql = "UPDATE {$table} SET " . implode(', ', $set) . " WHERE {$where}";

        return $this->execute($sql, array_merge($values, $whereParams));
    }

    /**
     * Delete records
     */
    public function delete(string $table, string $where, array $params = []): bool
    {
        $sql = "DELETE FROM {$table} WHERE {$where}";
        return $this->execute($sql, $params);
    }

    /**
     * Begin transaction
     */
    public function beginTransaction(): bool
    {
        return $this->connection->beginTransaction();
    }

    /**
     * Commit transaction
     */
    public function commit(): bool
    {
        return $this->connection->commit();
    }

    /**
     * Rollback transaction
     */
    public function rollback(): bool
    {
        return $this->connection->rollBack();
    }

    /**
     * Prevent cloning (Singleton)
     */
    private function __clone() {}

    /**
     * Prevent unserialization (Singleton)
     */
    public function __wakeup()
    {
        throw new \Exception("Cannot unserialize singleton");
    }
}
