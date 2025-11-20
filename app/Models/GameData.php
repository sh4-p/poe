<?php

declare(strict_types=1);

namespace App\Models;

/**
 * GameData Model
 * Handles game data (items, gems, passive tree)
 */
class GameData extends BaseModel
{
    protected string $table = 'uniques'; // Default table

    /**
     * Search unique items
     */
    public function searchUniques(string $query, array $filters = [], int $limit = 50): array
    {
        $sql = "SELECT * FROM uniques WHERE 1=1";
        $params = [];

        // Text search
        if (!empty($query)) {
            $sql .= " AND (name LIKE ? OR base_item LIKE ?)";
            $searchTerm = "%{$query}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        // Filter by POE version
        if (!empty($filters['poe_version'])) {
            $sql .= " AND poe_version = ?";
            $params[] = $filters['poe_version'];
        }

        // Filter by base item
        if (!empty($filters['base_item'])) {
            $sql .= " AND base_item LIKE ?";
            $params[] = "%{$filters['base_item']}%";
        }

        $sql .= " ORDER BY name ASC LIMIT ?";
        $params[] = $limit;

        return $this->query($sql, $params);
    }

    /**
     * Get unique by ID
     */
    public function getUnique(int $id): ?array
    {
        $sql = "SELECT * FROM uniques WHERE id = ? LIMIT 1";
        return $this->queryOne($sql, [$id]);
    }

    /**
     * Get unique by name
     */
    public function getUniqueByName(string $name): ?array
    {
        $sql = "SELECT * FROM uniques WHERE name = ? LIMIT 1";
        return $this->queryOne($sql, [$name]);
    }

    /**
     * Search base items
     */
    public function searchBaseItems(array $filters = [], int $limit = 50): array
    {
        $sql = "SELECT * FROM base_items WHERE 1=1";
        $params = [];

        // Filter by name
        if (!empty($filters['name'])) {
            $sql .= " AND name LIKE ?";
            $params[] = "%{$filters['name']}%";
        }

        // Filter by item class
        if (!empty($filters['item_class'])) {
            $sql .= " AND item_class = ?";
            $params[] = $filters['item_class'];
        }

        // Filter by item level
        if (isset($filters['min_level'])) {
            $sql .= " AND item_level >= ?";
            $params[] = $filters['min_level'];
        }

        if (isset($filters['max_level'])) {
            $sql .= " AND item_level <= ?";
            $params[] = $filters['max_level'];
        }

        $sql .= " ORDER BY name ASC LIMIT ?";
        $params[] = $limit;

        return $this->query($sql, $params);
    }

    /**
     * Get base item by ID
     */
    public function getBaseItem(int $id): ?array
    {
        $sql = "SELECT * FROM base_items WHERE id = ? LIMIT 1";
        return $this->queryOne($sql, [$id]);
    }

    /**
     * Get item classes
     */
    public function getItemClasses(): array
    {
        $sql = "SELECT DISTINCT item_class FROM base_items ORDER BY item_class ASC";
        $results = $this->query($sql);

        return array_column($results, 'item_class');
    }

    /**
     * Search skill gems
     */
    public function searchSkillGems(array $filters = [], int $limit = 50): array
    {
        $sql = "SELECT * FROM skill_gems WHERE 1=1";
        $params = [];

        // Filter by name
        if (!empty($filters['name'])) {
            $sql .= " AND name LIKE ?";
            $params[] = "%{$filters['name']}%";
        }

        // Filter by gem color
        if (!empty($filters['gem_color'])) {
            $sql .= " AND gem_color = ?";
            $params[] = $filters['gem_color'];
        }

        // Filter by support/active
        if (isset($filters['is_support'])) {
            $sql .= " AND is_support = ?";
            $params[] = (int)$filters['is_support'];
        }

        // Filter by tags
        if (!empty($filters['tag'])) {
            $sql .= " AND gem_tags LIKE ?";
            $params[] = "%{$filters['tag']}%";
        }

        // Filter by POE version
        if (!empty($filters['poe_version'])) {
            $sql .= " AND poe_version = ?";
            $params[] = $filters['poe_version'];
        }

        $sql .= " ORDER BY name ASC LIMIT ?";
        $params[] = $limit;

        return $this->query($sql, $params);
    }

    /**
     * Get skill gem by ID
     */
    public function getSkillGem(int $id): ?array
    {
        $sql = "SELECT * FROM skill_gems WHERE id = ? LIMIT 1";
        return $this->queryOne($sql, [$id]);
    }

    /**
     * Get skill gem by name
     */
    public function getSkillGemByName(string $name): ?array
    {
        $sql = "SELECT * FROM skill_gems WHERE name = ? LIMIT 1";
        return $this->queryOne($sql, [$name]);
    }

    /**
     * Get support gems
     */
    public function getSupportGems(int $limit = 100): array
    {
        $sql = "SELECT * FROM skill_gems WHERE is_support = 1 ORDER BY name ASC LIMIT ?";
        return $this->query($sql, [$limit]);
    }

    /**
     * Get active skill gems
     */
    public function getActiveGems(int $limit = 100): array
    {
        $sql = "SELECT * FROM skill_gems WHERE is_support = 0 ORDER BY name ASC LIMIT ?";
        return $this->query($sql, [$limit]);
    }

    /**
     * Get gems by color
     */
    public function getGemsByColor(string $color, int $limit = 100): array
    {
        $validColors = ['red', 'green', 'blue', 'white'];

        if (!in_array($color, $validColors)) {
            return [];
        }

        $sql = "SELECT * FROM skill_gems WHERE gem_color = ? ORDER BY name ASC LIMIT ?";
        return $this->query($sql, [$color, $limit]);
    }

    /**
     * Get passive tree data
     */
    public function getPassiveTreeData(string $version = 'latest'): ?array
    {
        $filePath = __DIR__ . '/../../data/passive-tree/' . $version . '.json';

        if (!file_exists($filePath)) {
            // Try loading latest
            $files = glob(__DIR__ . '/../../data/passive-tree/*.json');

            if (empty($files)) {
                return null;
            }

            // Get most recent file
            usort($files, function ($a, $b) {
                return filemtime($b) - filemtime($a);
            });

            $filePath = $files[0];
        }

        $jsonContent = file_get_contents($filePath);
        return json_decode($jsonContent, true);
    }

    /**
     * Get popular uniques (most used in builds)
     */
    public function getPopularUniques(int $limit = 20): array
    {
        // For now, just return random uniques
        // In future, track usage in builds
        $sql = "SELECT * FROM uniques ORDER BY RAND() LIMIT ?";
        return $this->query($sql, [$limit]);
    }

    /**
     * Get popular gems (most used in builds)
     */
    public function getPopularGems(int $limit = 20): array
    {
        // For now, just return random gems
        // In future, track usage in builds
        $sql = "SELECT * FROM skill_gems WHERE is_support = 0 ORDER BY RAND() LIMIT ?";
        return $this->query($sql, [$limit]);
    }

    /**
     * Bulk insert uniques (for scraper)
     */
    public function bulkInsertUniques(array $items): int
    {
        $count = 0;

        foreach ($items as $item) {
            try {
                $this->db->insert('uniques', [
                    'name' => $item['name'],
                    'base_item' => $item['base_item'],
                    'inventory_icon' => $item['inventory_icon'] ?? null,
                    'stats_json' => json_encode($item['stats']),
                    'poe_version' => $item['poe_version'],
                ]);
                $count++;
            } catch (\Exception $e) {
                error_log("Failed to insert unique: " . $item['name'] . " - " . $e->getMessage());
            }
        }

        return $count;
    }

    /**
     * Bulk insert skill gems (for scraper)
     */
    public function bulkInsertGems(array $gems): int
    {
        $count = 0;

        foreach ($gems as $gem) {
            try {
                $this->db->insert('skill_gems', [
                    'name' => $gem['name'],
                    'gem_color' => $gem['gem_color'],
                    'gem_tags' => $gem['gem_tags'],
                    'description' => $gem['description'] ?? '',
                    'stats_json' => json_encode($gem['stats']),
                    'poe_version' => $gem['poe_version'],
                    'is_support' => $gem['is_support'] ?? 0,
                ]);
                $count++;
            } catch (\Exception $e) {
                error_log("Failed to insert gem: " . $gem['name'] . " - " . $e->getMessage());
            }
        }

        return $count;
    }

    /**
     * Clear old data by version
     */
    public function clearOldData(string $table, string $version): bool
    {
        $validTables = ['uniques', 'skill_gems', 'base_items'];

        if (!in_array($table, $validTables)) {
            return false;
        }

        return $this->db->delete($table, 'poe_version = ?', [$version]);
    }
}
