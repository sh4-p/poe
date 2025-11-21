<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Response;
use App\Models\GameData;
use App\Models\Build;
use App\Services\GeminiAIService;

/**
 * API Controller
 * Handles AJAX/API endpoints
 */
class ApiController extends BaseController
{
    private GameData $gameDataModel;

    public function __construct($request)
    {
        parent::__construct($request);
        $this->gameDataModel = new GameData();
    }

    /**
     * Get items (search/filter)
     */
    public function getItems(): Response
    {
        $query = $this->request->query('q', '');
        $filters = [
            'poe_version' => $this->request->query('version'),
            'base_item' => $this->request->query('base'),
        ];

        $limit = (int)$this->request->query('limit', 50);
        $limit = min($limit, 100); // Max 100

        $items = $this->gameDataModel->searchUniques($query, $filters, $limit);

        return $this->json([
            'success' => true,
            'items' => $items,
            'count' => count($items)
        ]);
    }

    /**
     * Get item details by ID
     */
    public function getItemDetails(): Response
    {
        $itemId = (int)$this->request->param('id');
        $item = $this->gameDataModel->getUnique($itemId);

        if (!$item) {
            return $this->error('Item not found', 404);
        }

        // Parse stats JSON
        $item['stats'] = json_decode($item['stats_json'], true);
        unset($item['stats_json']);

        return $this->success(['item' => $item]);
    }

    /**
     * Get passive tree data
     */
    public function getPassiveTree(): Response
    {
        $version = $this->request->query('version', 'latest');
        $treeData = $this->gameDataModel->getPassiveTreeData($version);

        if (!$treeData) {
            return $this->error('Passive tree data not found', 404);
        }

        return $this->json([
            'success' => true,
            'tree' => $treeData,
            'version' => $version
        ]);
    }

    /**
     * Get skill gems (search/filter)
     */
    public function getSkillGems(): Response
    {
        $filters = [
            'name' => $this->request->query('q'),
            'gem_color' => $this->request->query('color'),
            'is_support' => $this->request->query('support'),
            'tag' => $this->request->query('tag'),
            'poe_version' => $this->request->query('version'),
        ];

        $limit = (int)$this->request->query('limit', 50);
        $limit = min($limit, 100);

        $gems = $this->gameDataModel->searchSkillGems(array_filter($filters), $limit);

        // Parse stats JSON for each gem
        foreach ($gems as &$gem) {
            $gem['stats'] = json_decode($gem['stats_json'], true);
            unset($gem['stats_json']);
        }

        return $this->json([
            'success' => true,
            'gems' => $gems,
            'count' => count($gems)
        ]);
    }

    /**
     * Search uniques
     */
    public function searchUniques(): Response
    {
        $query = $this->request->query('q', '');
        $limit = (int)$this->request->query('limit', 20);
        $limit = min($limit, 50);

        $uniques = $this->gameDataModel->searchUniques($query, [], $limit);

        // Simplify response
        $results = array_map(function ($item) {
            return [
                'id' => $item['id'],
                'name' => $item['name'],
                'base_item' => $item['base_item'],
                'icon' => $item['inventory_icon']
            ];
        }, $uniques);

        return $this->json([
            'success' => true,
            'results' => $results
        ]);
    }

    /**
     * Search gems
     */
    public function searchGems(): Response
    {
        $query = $this->request->query('q', '');
        $supportOnly = $this->request->query('support') === '1';

        $filters = ['name' => $query];

        if ($supportOnly) {
            $filters['is_support'] = 1;
        }

        $gems = $this->gameDataModel->searchSkillGems(array_filter($filters), 20);

        // Simplify response
        $results = array_map(function ($gem) {
            return [
                'id' => $gem['id'],
                'name' => $gem['name'],
                'color' => $gem['gem_color'],
                'is_support' => (bool)$gem['is_support'],
                'tags' => $gem['gem_tags']
            ];
        }, $gems);

        return $this->json([
            'success' => true,
            'results' => $results
        ]);
    }

    /**
     * Generate build with AI
     */
    public function generateBuildWithAI(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $userId = $this->getUserId();

        // Get user prompt and parameters
        $prompt = $this->request->input('prompt');
        $ascendancy = $this->request->input('ascendancy');
        $mainSkill = $this->request->input('main_skill');
        $budget = $this->request->input('budget', 'medium');
        $contentFocus = $this->request->input('content_focus', 'mapping');

        if (empty($prompt)) {
            return $this->error('Prompt is required', 400);
        }

        // Build context for AI
        $context = [
            'ascendancy' => $ascendancy,
            'main_skill' => $mainSkill,
            'budget' => $budget,
            'content_focus' => $contentFocus,
        ];

        // Get popular items and gems for context
        $popularUniques = $this->gameDataModel->getPopularUniques(30);
        $popularGems = $this->gameDataModel->getPopularGems(20);

        $context['available_uniques'] = array_column($popularUniques, 'name');
        $context['available_gems'] = array_column($popularGems, 'name');

        // Call AI service
        try {
            $aiService = new GeminiAIService();
            $buildData = $aiService->generateBuild($prompt, $context);

            if (!$buildData) {
                return $this->error('Failed to generate build', 500);
            }

            // Create build
            $buildModel = new Build();
            $buildId = $buildModel->createBuild($userId, [
                'build_name' => $buildData['build_name'] ?? 'AI Generated Build',
                'ascendancy_class' => $buildData['ascendancy_class'] ?? $ascendancy ?? 'Ascendant',
                'poe_version' => '3.25'
            ]);

            if (!$buildId) {
                return $this->error('Failed to create build', 500);
            }

            // Save build data
            if (isset($buildData['items'])) {
                $buildModel->saveBuildData($buildId, 'items', $buildData['items']);
            }

            if (isset($buildData['skill_gems'])) {
                $buildModel->saveBuildData($buildId, 'gems', $buildData['skill_gems']);
            }

            if (isset($buildData['passive_tree_url'])) {
                $buildModel->saveBuildData($buildId, 'passive_tree', [
                    'url' => $buildData['passive_tree_url']
                ]);
            }

            return $this->success([
                'build_id' => $buildId,
                'build_data' => $buildData
            ], 'Build generated successfully');

        } catch (\Exception $e) {
            error_log('AI Build Generation Error: ' . $e->getMessage());
            return $this->error('AI service error: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get popular builds
     */
    public function getPopularBuilds(): Response
    {
        $limit = (int)$this->request->query('limit', 10);
        $limit = min($limit, 50);

        $buildModel = new Build();
        $builds = $buildModel->getPopularBuilds($limit);

        return $this->success(['builds' => $builds]);
    }

    /**
     * Get build stats
     */
    public function getBuildStats(): Response
    {
        $buildId = (int)$this->request->param('id');

        $buildModel = new Build();
        $build = $buildModel->find($buildId);

        if (!$build) {
            return $this->error('Build not found', 404);
        }

        // Calculate stats from build data
        $buildData = $buildModel->getAllBuildData($buildId);

        $stats = [
            'has_passive_tree' => isset($buildData['passive_tree']),
            'has_items' => isset($buildData['items']),
            'has_gems' => isset($buildData['gems']),
            'item_count' => isset($buildData['items']) ? count($buildData['items']) : 0,
            'gem_count' => isset($buildData['gems']) ? count($buildData['gems']) : 0,
        ];

        return $this->success(['stats' => $stats]);
    }

    /**
     * Autocomplete search (universal)
     */
    public function autocomplete(): Response
    {
        $query = $this->request->query('q', '');
        $type = $this->request->query('type', 'all'); // all, items, gems, builds

        if (strlen($query) < 2) {
            return $this->json(['success' => true, 'results' => []]);
        }

        $results = [];

        if ($type === 'all' || $type === 'items') {
            $items = $this->gameDataModel->searchUniques($query, [], 10);
            $results['items'] = array_map(fn($i) => [
                'id' => $i['id'],
                'name' => $i['name'],
                'type' => 'item'
            ], $items);
        }

        if ($type === 'all' || $type === 'gems') {
            $gems = $this->gameDataModel->searchSkillGems(['name' => $query], 10);
            $results['gems'] = array_map(fn($g) => [
                'id' => $g['id'],
                'name' => $g['name'],
                'type' => 'gem'
            ], $gems);
        }

        if ($type === 'all' || $type === 'builds') {
            $buildModel = new Build();
            $builds = $buildModel->searchBuilds($query, 10);
            $results['builds'] = array_map(fn($b) => [
                'id' => $b['id'],
                'name' => $b['build_name'],
                'type' => 'build'
            ], $builds);
        }

        return $this->json(['success' => true, 'results' => $results]);
    }

    /**
     * Get passive skill tree data
     */
    public function passiveTree(): Response
    {
        $version = $this->request->query('version', 'latest');

        try {
            // Try database first
            $treeData = $this->gameDataModel->getPassiveTreeFromDB($version);

            // Fallback to file if database doesn't have it
            if (!$treeData) {
                $treeData = $this->gameDataModel->getPassiveTreeData($version);
            }

            if ($treeData) {
                return $this->json([
                    'success' => true,
                    'version' => $version,
                    'tree' => $treeData,
                    'nodeCount' => count($treeData['nodes'] ?? [])
                ]);
            }

            return $this->json([
                'success' => false,
                'error' => 'Passive tree data not found for version: ' . $version
            ], 404);

        } catch (\Exception $e) {
            error_log("Passive tree API error: " . $e->getMessage());
            return $this->json([
                'success' => false,
                'error' => 'Failed to load passive tree data'
            ], 500);
        }
    }

    /**
     * Health check endpoint
     */
    public function health(): Response
    {
        return $this->json([
            'status' => 'ok',
            'timestamp' => time(),
            'version' => '1.0.0'
        ]);
    }
}
