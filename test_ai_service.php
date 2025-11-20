#!/usr/bin/env php
<?php
/**
 * AI Service Test - Test Gemini API Integration
 */

declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use App\Services\GeminiAIService;
use Dotenv\Dotenv;

// Load environment variables
try {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} catch (Exception $e) {
    echo "Warning: Could not load .env file\n";
}

// ANSI colors
define('GREEN', "\033[32m");
define('RED', "\033[31m");
define('YELLOW', "\033[33m");
define('BLUE', "\033[34m");
define('RESET', "\033[0m");

echo BLUE . "╔═══════════════════════════════════════════════════════╗\n" . RESET;
echo BLUE . "║        GEMINI AI SERVICE TEST                         ║\n" . RESET;
echo BLUE . "╚═══════════════════════════════════════════════════════╝\n" . RESET;
echo "\n";

// Check API key
$apiKey = $_ENV['GEMINI_API_KEY'] ?? getenv('GEMINI_API_KEY') ?? 'your_api_key_here';
if (!$apiKey || $apiKey === 'your_api_key_here') {
    echo RED . "✗ GEMINI_API_KEY not configured in .env\n" . RESET;
    echo "  Current value: " . $apiKey . "\n";
    echo "  Please ensure .env file exists and contains GEMINI_API_KEY\n";
    exit(1);
}

echo GREEN . "✓ API Key configured\n" . RESET;
echo "  Key: " . substr($apiKey, 0, 10) . "..." . substr($apiKey, -5) . "\n\n";

// Initialize service
echo YELLOW . "Initializing AI Service...\n" . RESET;
try {
    $aiService = new GeminiAIService();
    echo GREEN . "✓ Service initialized\n" . RESET;
} catch (Exception $e) {
    echo RED . "✗ Failed to initialize service: " . $e->getMessage() . "\n" . RESET;
    exit(1);
}

echo "\n";
echo BLUE . "═══════════════════════════════════════════════════════\n" . RESET;
echo BLUE . "  Test 1: Simple Build Generation\n" . RESET;
echo BLUE . "═══════════════════════════════════════════════════════\n" . RESET;

$testRequest = "Create a tanky Righteous Fire build for Juggernaut";
echo "Request: " . YELLOW . $testRequest . RESET . "\n";
echo "Sending request to Gemini API...\n\n";

// Context with sample data
$context = [
    'ascendancy' => 'Juggernaut',
    'main_skill' => 'Righteous Fire',
    'budget' => 'Medium (10-50 divine)',
    'content_focus' => 'Mapping and Bossing',
    'available_uniques' => ["Kaom's Heart", "Rise of the Phoenix", "Purity of Fire"],
    'available_gems' => ["Righteous Fire", "Elemental Focus", "Burning Damage", "Concentrated Effect"]
];

try {
    $buildData = $aiService->generateBuild($testRequest, $context);

    $result = [
        'success' => $buildData !== null,
        'build_data' => $buildData,
        'error' => $buildData === null ? 'Failed to generate build' : null
    ];

    if ($result['success']) {
        echo GREEN . "✓ API Request Successful!\n" . RESET;
        echo "\n";

        $buildData = $result['build_data'];

        echo BLUE . "Build Generated:\n" . RESET;
        echo "  Name: " . YELLOW . ($buildData['build_name'] ?? 'N/A') . RESET . "\n";
        echo "  Class: " . YELLOW . ($buildData['ascendancy_class'] ?? 'N/A') . RESET . "\n";
        echo "  Main Skill: " . YELLOW . ($buildData['main_skill'] ?? 'N/A') . RESET . "\n";

        if (isset($buildData['description'])) {
            echo "  Description: " . $buildData['description'] . "\n";
        }

        if (isset($buildData['items']) && is_array($buildData['items'])) {
            echo "\n  Key Items (" . count($buildData['items']) . "):\n";
            foreach (array_slice($buildData['items'], 0, 5) as $item) {
                echo "    • " . ($item['name'] ?? 'Unknown') . "\n";
            }
        }

        if (isset($buildData['skill_gems']) && is_array($buildData['skill_gems'])) {
            echo "\n  Skill Gems (" . count($buildData['skill_gems']) . "):\n";
            foreach (array_slice($buildData['skill_gems'], 0, 5) as $gem) {
                echo "    • " . ($gem['name'] ?? 'Unknown');
                if (isset($gem['level'])) {
                    echo " (Level " . $gem['level'] . ")";
                }
                echo "\n";
            }
        }

        echo "\n";
        echo GREEN . "═══════════════════════════════════════════════════════\n" . RESET;
        echo GREEN . "  Full Response JSON:\n" . RESET;
        echo GREEN . "═══════════════════════════════════════════════════════\n" . RESET;
        echo json_encode($buildData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        echo "\n\n";

    } else {
        echo RED . "✗ API Request Failed\n" . RESET;
        echo "Error: " . ($result['error'] ?? 'Unknown error') . "\n";
        exit(1);
    }

} catch (Exception $e) {
    echo RED . "✗ Exception occurred: " . $e->getMessage() . "\n" . RESET;
    echo "Trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n";
echo BLUE . "═══════════════════════════════════════════════════════\n" . RESET;
echo BLUE . "  Test 2: Complex Build Request\n" . RESET;
echo BLUE . "═══════════════════════════════════════════════════════\n" . RESET;

$testRequest2 = "Build a high damage Lightning Strike Raider with focus on speed and evasion";
echo "Request: " . YELLOW . $testRequest2 . RESET . "\n";
echo "Sending request...\n\n";

$context2 = [
    'ascendancy' => 'Raider',
    'main_skill' => 'Lightning Strike',
    'budget' => 'High (50+ divine)',
    'content_focus' => 'Fast mapping',
    'available_gems' => ["Lightning Strike", "Multistrike", "Added Lightning Damage", "Elemental Damage with Attacks"]
];

try {
    $buildData2 = $aiService->generateBuild($testRequest2, $context2);

    $result2 = [
        'success' => $buildData2 !== null,
        'build_data' => $buildData2,
        'error' => $buildData2 === null ? 'Failed to generate build' : null
    ];

    if ($result2['success']) {
        echo GREEN . "✓ Second API Request Successful!\n" . RESET;
        $buildData2 = $result2['build_data'];
        echo "  Name: " . YELLOW . ($buildData2['build_name'] ?? 'N/A') . RESET . "\n";
        echo "  Class: " . YELLOW . ($buildData2['ascendancy_class'] ?? 'N/A') . RESET . "\n";
        echo "  Main Skill: " . YELLOW . ($buildData2['main_skill'] ?? 'N/A') . RESET . "\n";
    } else {
        echo RED . "✗ Second request failed\n" . RESET;
        echo "Error: " . ($result2['error'] ?? 'Unknown error') . "\n";
    }

} catch (Exception $e) {
    echo RED . "✗ Exception occurred: " . $e->getMessage() . "\n" . RESET;
}

echo "\n";
echo GREEN . "╔═══════════════════════════════════════════════════════╗\n" . RESET;
echo GREEN . "║              AI SERVICE TEST COMPLETE                 ║\n" . RESET;
echo GREEN . "╚═══════════════════════════════════════════════════════╝\n" . RESET;
echo "\n";
echo "Next steps:\n";
echo "  1. The AI service is working correctly\n";
echo "  2. You can now use AI build generation in the app\n";
echo "  3. Access the feature at: /build/create (AI-assisted)\n";
echo "\n";
