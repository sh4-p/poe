<?php

declare(strict_types=1);

namespace App\Models;

/**
 * Build Model
 * Handles Path of Exile build operations
 */
class Build extends BaseModel
{
    protected string $table = 'builds';

    /**
     * Create new build
     */
    public function createBuild(int $userId, array $data): ?int
    {
        // Validate required fields
        if (!isset($data['build_name'], $data['ascendancy_class'], $data['poe_version'])) {
            return null;
        }

        $buildData = [
            'user_id' => $userId,
            'build_name' => $data['build_name'],
            'ascendancy_class' => $data['ascendancy_class'],
            'poe_version' => $data['poe_version'],
            'is_public' => $data['is_public'] ?? false,
        ];

        return $this->create($buildData);
    }

    /**
     * Get builds by user ID
     */
    public function getUserBuilds(int $userId, int $limit = 50): array
    {
        $sql = "
            SELECT * FROM {$this->table}
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT ?
        ";

        return $this->query($sql, [$userId, $limit]);
    }

    /**
     * Get public builds
     */
    public function getPublicBuilds(int $limit = 50, int $offset = 0): array
    {
        $sql = "
            SELECT b.*, u.username
            FROM {$this->table} b
            JOIN users u ON b.user_id = u.id
            WHERE b.is_public = 1
            ORDER BY b.updated_at DESC
            LIMIT ? OFFSET ?
        ";

        return $this->query($sql, [$limit, $offset]);
    }

    /**
     * Get build by ID with user info
     */
    public function getBuildWithUser(int $buildId): ?array
    {
        $sql = "
            SELECT b.*, u.username
            FROM {$this->table} b
            JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
            LIMIT 1
        ";

        return $this->queryOne($sql, [$buildId]);
    }

    /**
     * Check if user owns build
     */
    public function isOwner(int $buildId, int $userId): bool
    {
        $build = $this->find($buildId);
        return $build && (int)$build['user_id'] === $userId;
    }

    /**
     * Toggle build visibility
     */
    public function togglePublic(int $buildId, int $userId): bool
    {
        if (!$this->isOwner($buildId, $userId)) {
            return false;
        }

        $build = $this->find($buildId);
        $newStatus = !$build['is_public'];

        return $this->update($buildId, ['is_public' => $newStatus]);
    }

    /**
     * Update build info
     */
    public function updateBuild(int $buildId, int $userId, array $data): bool
    {
        if (!$this->isOwner($buildId, $userId)) {
            return false;
        }

        // Remove immutable fields
        unset($data['id'], $data['user_id'], $data['created_at']);

        if (empty($data)) {
            return false;
        }

        return $this->update($buildId, $data);
    }

    /**
     * Delete build
     */
    public function deleteBuild(int $buildId, int $userId): bool
    {
        if (!$this->isOwner($buildId, $userId)) {
            return false;
        }

        // Delete associated build data first (cascade should handle this, but being explicit)
        $this->db->delete('build_data', 'build_id = ?', [$buildId]);

        return $this->delete($buildId);
    }

    /**
     * Get build data by type
     */
    public function getBuildData(int $buildId, string $dataType): ?array
    {
        $sql = "SELECT json_data FROM build_data WHERE build_id = ? AND data_type = ? LIMIT 1";
        $result = $this->queryOne($sql, [$buildId, $dataType]);

        if (!$result) {
            return null;
        }

        return json_decode($result['json_data'], true);
    }

    /**
     * Save build data
     */
    public function saveBuildData(int $buildId, string $dataType, array $jsonData): bool
    {
        // Valid data types
        $validTypes = ['passive_tree', 'items', 'skills', 'gems', 'jewels', 'flasks'];

        if (!in_array($dataType, $validTypes)) {
            return false;
        }

        // Check if data exists
        $existing = $this->queryOne(
            "SELECT id FROM build_data WHERE build_id = ? AND data_type = ? LIMIT 1",
            [$buildId, $dataType]
        );

        $jsonString = json_encode($jsonData, JSON_UNESCAPED_UNICODE);

        if ($existing) {
            // Update existing
            return $this->db->update(
                'build_data',
                ['json_data' => $jsonString],
                'build_id = ? AND data_type = ?',
                [$buildId, $dataType]
            );
        } else {
            // Insert new
            return $this->db->insert('build_data', [
                'build_id' => $buildId,
                'data_type' => $dataType,
                'json_data' => $jsonString,
            ]) > 0;
        }
    }

    /**
     * Get all build data
     */
    public function getAllBuildData(int $buildId): array
    {
        $sql = "SELECT data_type, json_data FROM build_data WHERE build_id = ?";
        $results = $this->query($sql, [$buildId]);

        $data = [];
        foreach ($results as $row) {
            $data[$row['data_type']] = json_decode($row['json_data'], true);
        }

        return $data;
    }

    /**
     * Search builds by name or ascendancy
     */
    public function searchBuilds(string $query, int $limit = 50): array
    {
        $sql = "
            SELECT b.*, u.username
            FROM {$this->table} b
            JOIN users u ON b.user_id = u.id
            WHERE b.is_public = 1
            AND (
                b.build_name LIKE ?
                OR b.ascendancy_class LIKE ?
            )
            ORDER BY b.updated_at DESC
            LIMIT ?
        ";

        $searchTerm = "%{$query}%";
        return $this->query($sql, [$searchTerm, $searchTerm, $limit]);
    }

    /**
     * Get builds by ascendancy
     */
    public function getBuildsByAscendancy(string $ascendancy, int $limit = 50): array
    {
        $sql = "
            SELECT b.*, u.username
            FROM {$this->table} b
            JOIN users u ON b.user_id = u.id
            WHERE b.is_public = 1
            AND b.ascendancy_class = ?
            ORDER BY b.updated_at DESC
            LIMIT ?
        ";

        return $this->query($sql, [$ascendancy, $limit]);
    }

    /**
     * Get popular builds (most viewed - would need views tracking)
     */
    public function getPopularBuilds(int $limit = 10): array
    {
        // For now, just return recent public builds
        // In future, add view count tracking
        return $this->getPublicBuilds($limit);
    }

    /**
     * Clone build
     */
    public function cloneBuild(int $buildId, int $newUserId): ?int
    {
        $originalBuild = $this->find($buildId);

        if (!$originalBuild) {
            return null;
        }

        // Check if build is public or user owns it
        if (!$originalBuild['is_public'] && (int)$originalBuild['user_id'] !== $newUserId) {
            return null;
        }

        // Create new build
        $newBuildId = $this->create([
            'user_id' => $newUserId,
            'build_name' => $originalBuild['build_name'] . ' (Copy)',
            'ascendancy_class' => $originalBuild['ascendancy_class'],
            'poe_version' => $originalBuild['poe_version'],
            'is_public' => false, // Cloned builds are private by default
        ]);

        if (!$newBuildId) {
            return null;
        }

        // Copy build data
        $buildData = $this->getAllBuildData($buildId);

        foreach ($buildData as $dataType => $data) {
            $this->saveBuildData($newBuildId, $dataType, $data);
        }

        return $newBuildId;
    }

    /**
     * Get ascendancy list
     */
    public function getAscendancyList(): array
    {
        return [
            'Slayer', 'Gladiator', 'Champion',
            'Raider', 'Deadeye', 'Pathfinder',
            'Occultist', 'Elementalist', 'Necromancer',
            'Juggernaut', 'Berserker', 'Chieftain',
            'Inquisitor', 'Hierophant', 'Guardian',
            'Assassin', 'Trickster', 'Saboteur',
            'Ascendant'
        ];
    }
}
