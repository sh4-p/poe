<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

/**
 * Base Model
 * Abstract base class for all models
 */
abstract class BaseModel
{
    protected Database $db;
    protected string $table;
    protected string $primaryKey = 'id';

    public function __construct()
    {
        $dbConfig = require __DIR__ . '/../../config/database.php';
        $this->db = Database::getInstance($dbConfig);
    }

    /**
     * Find record by ID
     */
    public function find(int $id): ?array
    {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ? LIMIT 1";
        return $this->db->fetchOne($sql, [$id]);
    }

    /**
     * Find all records
     */
    public function all(int $limit = 100, int $offset = 0): array
    {
        $sql = "SELECT * FROM {$this->table} LIMIT ? OFFSET ?";
        return $this->db->fetchAll($sql, [$limit, $offset]);
    }

    /**
     * Find records with WHERE conditions
     */
    public function where(array $conditions, int $limit = 100): array
    {
        $where = [];
        $params = [];

        foreach ($conditions as $column => $value) {
            $where[] = "{$column} = ?";
            $params[] = $value;
        }

        $whereClause = implode(' AND ', $where);
        $sql = "SELECT * FROM {$this->table} WHERE {$whereClause} LIMIT ?";
        $params[] = $limit;

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Find first record with WHERE conditions
     */
    public function whereFirst(array $conditions): ?array
    {
        $where = [];
        $params = [];

        foreach ($conditions as $column => $value) {
            $where[] = "{$column} = ?";
            $params[] = $value;
        }

        $whereClause = implode(' AND ', $where);
        $sql = "SELECT * FROM {$this->table} WHERE {$whereClause} LIMIT 1";

        return $this->db->fetchOne($sql, $params);
    }

    /**
     * Create new record
     */
    public function create(array $data): int
    {
        return $this->db->insert($this->table, $data);
    }

    /**
     * Update record by ID
     */
    public function update(int $id, array $data): bool
    {
        return $this->db->update($this->table, $data, "{$this->primaryKey} = ?", [$id]);
    }

    /**
     * Delete record by ID
     */
    public function delete(int $id): bool
    {
        return $this->db->delete($this->table, "{$this->primaryKey} = ?", [$id]);
    }

    /**
     * Count records
     */
    public function count(array $conditions = []): int
    {
        if (empty($conditions)) {
            $sql = "SELECT COUNT(*) as count FROM {$this->table}";
            $result = $this->db->fetchOne($sql);
        } else {
            $where = [];
            $params = [];

            foreach ($conditions as $column => $value) {
                $where[] = "{$column} = ?";
                $params[] = $value;
            }

            $whereClause = implode(' AND ', $where);
            $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE {$whereClause}";
            $result = $this->db->fetchOne($sql, $params);
        }

        return (int)($result['count'] ?? 0);
    }

    /**
     * Check if record exists
     */
    public function exists(int $id): bool
    {
        $sql = "SELECT 1 FROM {$this->table} WHERE {$this->primaryKey} = ? LIMIT 1";
        $result = $this->db->fetchOne($sql, [$id]);
        return $result !== null;
    }

    /**
     * Execute raw SQL query
     */
    protected function query(string $sql, array $params = []): array
    {
        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Execute raw SQL and return single result
     */
    protected function queryOne(string $sql, array $params = []): ?array
    {
        return $this->db->fetchOne($sql, $params);
    }

    /**
     * Begin transaction
     */
    protected function beginTransaction(): bool
    {
        return $this->db->beginTransaction();
    }

    /**
     * Commit transaction
     */
    protected function commit(): bool
    {
        return $this->db->commit();
    }

    /**
     * Rollback transaction
     */
    protected function rollback(): bool
    {
        return $this->db->rollback();
    }
}
