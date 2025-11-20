<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Response;
use App\Models\Build;
use App\Models\GameData;

/**
 * Build Controller
 * Handles Path of Exile build management
 */
class BuildController extends BaseController
{
    private Build $buildModel;
    private GameData $gameDataModel;

    public function __construct($request)
    {
        parent::__construct($request);
        $this->buildModel = new Build();
        $this->gameDataModel = new GameData();
    }

    /**
     * List all public builds
     */
    public function index(): Response
    {
        $page = (int)$this->request->query('page', 1);
        $perPage = 24;
        $offset = ($page - 1) * $perPage;

        $builds = $this->buildModel->getPublicBuilds($perPage, $offset);
        $ascendancies = $this->buildModel->getAscendancyList();

        return $this->render('build/index.twig', [
            'title' => 'Browse Builds',
            'builds' => $builds,
            'ascendancies' => $ascendancies,
            'current_page' => $page
        ]);
    }

    /**
     * List user's builds
     */
    public function myBuilds(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $userId = $this->getUserId();
        $builds = $this->buildModel->getUserBuilds($userId, 100);

        return $this->render('build/my-builds.twig', [
            'title' => 'My Builds',
            'builds' => $builds
        ]);
    }

    /**
     * Show build creation page
     */
    public function new(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $ascendancies = $this->buildModel->getAscendancyList();

        return $this->render('build/create.twig', [
            'title' => 'Create New Build',
            'ascendancies' => $ascendancies,
            'csrf_token' => $this->generateCsrfToken()
        ]);
    }

    /**
     * Show build edit page
     */
    public function edit(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $buildId = (int)$this->request->param('id');
        $userId = $this->getUserId();

        // Check ownership
        if (!$this->buildModel->isOwner($buildId, $userId)) {
            if ($this->request->expectsJson()) {
                return $this->error('Unauthorized', 403);
            }
            return $this->redirect('/my-builds');
        }

        $build = $this->buildModel->getBuildWithUser($buildId);
        $buildData = $this->buildModel->getAllBuildData($buildId);
        $ascendancies = $this->buildModel->getAscendancyList();

        return $this->render('build/edit.twig', [
            'title' => 'Edit Build - ' . $build['build_name'],
            'build' => $build,
            'build_data' => $buildData,
            'ascendancies' => $ascendancies,
            'csrf_token' => $this->generateCsrfToken()
        ]);
    }

    /**
     * View public or owned build
     */
    public function view(): Response
    {
        $buildId = (int)$this->request->param('id');
        $build = $this->buildModel->getBuildWithUser($buildId);

        if (!$build) {
            return $this->error('Build not found', 404);
        }

        // Check if user can view this build
        $userId = $this->getUserId();
        $canView = $build['is_public'] || ($userId && (int)$build['user_id'] === $userId);

        if (!$canView) {
            return $this->error('Build is private', 403);
        }

        $buildData = $this->buildModel->getAllBuildData($buildId);

        return $this->render('build/view.twig', [
            'title' => $build['build_name'],
            'build' => $build,
            'build_data' => $buildData,
            'is_owner' => $userId && (int)$build['user_id'] === $userId
        ]);
    }

    /**
     * Save build (AJAX)
     */
    public function save(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $userId = $this->getUserId();
        $buildId = (int)$this->request->input('build_id');

        // If build_id is 0, create new build
        if ($buildId === 0) {
            $buildName = $this->request->input('build_name');
            $ascendancy = $this->request->input('ascendancy_class');
            $poeVersion = $this->request->input('poe_version', '3.25');

            if (empty($buildName) || empty($ascendancy)) {
                return $this->error('Build name and ascendancy are required', 400);
            }

            $buildId = $this->buildModel->createBuild($userId, [
                'build_name' => $buildName,
                'ascendancy_class' => $ascendancy,
                'poe_version' => $poeVersion
            ]);

            if (!$buildId) {
                return $this->error('Failed to create build', 500);
            }

            return $this->success(['build_id' => $buildId], 'Build created successfully');
        }

        // Check ownership
        if (!$this->buildModel->isOwner($buildId, $userId)) {
            return $this->error('Unauthorized', 403);
        }

        // Update build info if provided
        $buildInfo = $this->request->input('build_info');
        if ($buildInfo) {
            $this->buildModel->updateBuild($buildId, $userId, $buildInfo);
        }

        // Save build data
        $dataType = $this->request->input('data_type');
        $jsonData = $this->request->input('json_data');

        if ($dataType && $jsonData) {
            $success = $this->buildModel->saveBuildData($buildId, $dataType, $jsonData);

            if ($success) {
                return $this->success(['build_id' => $buildId], 'Build saved successfully');
            }

            return $this->error('Failed to save build data', 500);
        }

        return $this->success(['build_id' => $buildId], 'Build updated successfully');
    }

    /**
     * Delete build
     */
    public function delete(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $buildId = (int)$this->request->param('id');
        $userId = $this->getUserId();

        $success = $this->buildModel->deleteBuild($buildId, $userId);

        if ($success) {
            if ($this->request->expectsJson()) {
                return $this->success([], 'Build deleted successfully');
            }

            $_SESSION['flash_message'] = 'Build deleted successfully';
            return $this->redirect('/my-builds');
        }

        return $this->error('Failed to delete build', 500);
    }

    /**
     * Show import page
     */
    public function showImport(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        return $this->render('build/import.twig', [
            'title' => 'Import Build',
            'csrf_token' => $this->generateCsrfToken()
        ]);
    }

    /**
     * Import build from POB code or URL
     */
    public function import(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $pobCode = $this->request->input('pob_code');
        $pastebinUrl = $this->request->input('pastebin_url');

        if (empty($pobCode) && empty($pastebinUrl)) {
            return $this->error('Please provide POB code or Pastebin URL', 400);
        }

        // If Pastebin URL provided, fetch the code
        if (!empty($pastebinUrl)) {
            // Extract pastebin ID
            preg_match('/pastebin\.com\/(?:raw\/)?([a-zA-Z0-9]+)/', $pastebinUrl, $matches);

            if (empty($matches[1])) {
                return $this->error('Invalid Pastebin URL', 400);
            }

            $pastebinId = $matches[1];
            $rawUrl = "https://pastebin.com/raw/{$pastebinId}";

            // Fetch content using Guzzle
            try {
                $client = new \GuzzleHttp\Client();
                $response = $client->get($rawUrl);
                $pobCode = $response->getBody()->getContents();
            } catch (\Exception $e) {
                return $this->error('Failed to fetch Pastebin content', 500);
            }
        }

        // Parse POB code (this is a placeholder - actual POB parsing is complex)
        // In a real implementation, you would decode and parse the XML structure
        $buildData = $this->parsePobCode($pobCode);

        if (!$buildData) {
            return $this->error('Failed to parse POB code', 400);
        }

        // Create build
        $userId = $this->getUserId();
        $buildId = $this->buildModel->createBuild($userId, [
            'build_name' => $buildData['build_name'] ?? 'Imported Build',
            'ascendancy_class' => $buildData['ascendancy'] ?? 'Ascendant',
            'poe_version' => $buildData['version'] ?? '3.25'
        ]);

        if (!$buildId) {
            return $this->error('Failed to create build', 500);
        }

        // Save build data
        if (isset($buildData['passive_tree'])) {
            $this->buildModel->saveBuildData($buildId, 'passive_tree', $buildData['passive_tree']);
        }

        if (isset($buildData['items'])) {
            $this->buildModel->saveBuildData($buildId, 'items', $buildData['items']);
        }

        if (isset($buildData['gems'])) {
            $this->buildModel->saveBuildData($buildId, 'gems', $buildData['gems']);
        }

        if ($this->request->expectsJson()) {
            return $this->success(['build_id' => $buildId], 'Build imported successfully');
        }

        $_SESSION['flash_message'] = 'Build imported successfully';
        return $this->redirect('/build/' . $buildId . '/edit');
    }

    /**
     * Export build as POB code
     */
    public function export(): Response
    {
        $buildId = (int)$this->request->param('id');
        $build = $this->buildModel->find($buildId);

        if (!$build) {
            return $this->error('Build not found', 404);
        }

        // Check if user can export this build
        $userId = $this->getUserId();
        $canExport = $build['is_public'] || ($userId && (int)$build['user_id'] === $userId);

        if (!$canExport) {
            return $this->error('Build is private', 403);
        }

        $buildData = $this->buildModel->getAllBuildData($buildId);

        // Generate POB code (placeholder - actual POB encoding is complex)
        $pobCode = $this->generatePobCode($build, $buildData);

        return $this->json([
            'success' => true,
            'pob_code' => $pobCode,
            'build_name' => $build['build_name']
        ]);
    }

    /**
     * Clone/fork a build
     */
    public function clone(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $buildId = (int)$this->request->input('build_id');
        $userId = $this->getUserId();

        $newBuildId = $this->buildModel->cloneBuild($buildId, $userId);

        if (!$newBuildId) {
            return $this->error('Failed to clone build', 500);
        }

        return $this->success(['build_id' => $newBuildId], 'Build cloned successfully');
    }

    /**
     * Toggle build visibility
     */
    public function toggleVisibility(): Response
    {
        // Require authentication
        $authCheck = $this->requireAuth();
        if ($authCheck) return $authCheck;

        $buildId = (int)$this->request->input('build_id');
        $userId = $this->getUserId();

        $success = $this->buildModel->togglePublic($buildId, $userId);

        if ($success) {
            $build = $this->buildModel->find($buildId);
            return $this->success([
                'is_public' => (bool)$build['is_public']
            ], 'Build visibility updated');
        }

        return $this->error('Failed to update visibility', 500);
    }

    /**
     * Parse POB code (placeholder implementation)
     */
    private function parsePobCode(string $pobCode): ?array
    {
        // This is a simplified placeholder
        // Real POB codes are base64-encoded compressed XML
        // Full implementation would require proper decoding and XML parsing

        try {
            // Attempt to decode (basic implementation)
            $decoded = base64_decode($pobCode, true);

            if ($decoded === false) {
                return null;
            }

            // In reality, you would decompress and parse XML here
            return [
                'build_name' => 'Imported Build',
                'ascendancy' => 'Ascendant',
                'version' => '3.25',
                'passive_tree' => [],
                'items' => [],
                'gems' => []
            ];
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Generate POB code (placeholder implementation)
     */
    private function generatePobCode(array $build, array $buildData): string
    {
        // This is a simplified placeholder
        // Real POB generation requires creating XML and compressing

        $data = [
            'name' => $build['build_name'],
            'ascendancy' => $build['ascendancy_class'],
            'version' => $build['poe_version'],
            'data' => $buildData
        ];

        $json = json_encode($data);
        return base64_encode($json);
    }
}
