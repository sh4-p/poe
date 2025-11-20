#!/usr/bin/env php
<?php
/**
 * AI Build Generation Demo
 * Shows how AI build generation works in the application
 */

declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use App\Services\GeminiAIService;
use App\Models\Build;
use App\Core\Database;
use Dotenv\Dotenv;

// Load environment
try {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} catch (Exception $e) {
    // Continue without .env
}

// ANSI colors
define('GREEN', "\033[32m");
define('RED', "\033[31m");
define('YELLOW', "\033[33m");
define('BLUE', "\033[34m");
define('CYAN', "\033[36m");
define('MAGENTA', "\033[35m");
define('RESET', "\033[0m");

echo "\n";
echo CYAN . "╔═══════════════════════════════════════════════════════╗\n" . RESET;
echo CYAN . "║       EXILE ARCHITECT - AI BUILD DEMO                ║\n" . RESET;
echo CYAN . "║       Interactive AI Build Generation                ║\n" . RESET;
echo CYAN . "╚═══════════════════════════════════════════════════════╝\n" . RESET;
echo "\n";

// Demo scenarios
$scenarios = [
    [
        'name' => 'Tanky RF Juggernaut',
        'request' => 'Create a very tanky Righteous Fire build for Juggernaut with focus on life regeneration and fire resistance',
        'context' => [
            'ascendancy' => 'Juggernaut',
            'main_skill' => 'Righteous Fire',
            'budget' => 'Medium (10-50 divine)',
            'content_focus' => 'All content including Ubers',
        ]
    ],
    [
        'name' => 'Fast Mapper Lightning Strike',
        'request' => 'Build a Lightning Strike Raider optimized for fast mapping with high movement speed and clear speed',
        'context' => [
            'ascendancy' => 'Raider',
            'main_skill' => 'Lightning Strike',
            'budget' => 'High (50+ divine)',
            'content_focus' => 'Fast mapping and bossing',
        ]
    ],
    [
        'name' => 'Budget League Starter',
        'request' => 'Create a budget-friendly league starter build that can handle yellow maps with minimal investment',
        'context' => [
            'budget' => 'Low (under 10 divine)',
            'content_focus' => 'League start and early mapping',
        ]
    ],
    [
        'name' => 'Minion Army Necromancer',
        'request' => 'Build a strong minion-based Necromancer with Spectres and Zombies for safe bossing',
        'context' => [
            'ascendancy' => 'Necromancer',
            'main_skill' => 'Summon Spectre',
            'budget' => 'Medium (10-50 divine)',
            'content_focus' => 'Safe bossing',
        ]
    ],
    [
        'name' => 'Glass Cannon Deadeye',
        'request' => 'Maximum damage bow build with Tornado Shot, willing to sacrifice defense for DPS',
        'context' => [
            'ascendancy' => 'Deadeye',
            'main_skill' => 'Tornado Shot',
            'budget' => 'Very High (100+ divine)',
            'content_focus' => 'Maximum DPS',
        ]
    ]
];

// Initialize AI service
echo YELLOW . "Initializing AI Service...\n" . RESET;
$aiService = new GeminiAIService();
echo GREEN . "✓ AI Service ready\n" . RESET;
echo "\n";

// Show available scenarios
echo BLUE . "Available Build Scenarios:\n" . RESET;
echo BLUE . "═══════════════════════════════════════════════════════\n" . RESET;
foreach ($scenarios as $index => $scenario) {
    $num = $index + 1;
    echo YELLOW . "  $num. {$scenario['name']}\n" . RESET;
    echo "     Request: " . CYAN . $scenario['request'] . RESET . "\n";
    if (isset($scenario['context']['ascendancy'])) {
        echo "     Class: " . MAGENTA . $scenario['context']['ascendancy'] . RESET . "\n";
    }
    if (isset($scenario['context']['budget'])) {
        echo "     Budget: " . $scenario['context']['budget'] . "\n";
    }
    echo "\n";
}

// Interactive mode
echo YELLOW . "Select a scenario (1-5) or 'custom' for custom build: " . RESET;
$input = trim(fgets(STDIN));

if ($input === 'custom') {
    echo "\n" . YELLOW . "Enter your build request: " . RESET;
    $customRequest = trim(fgets(STDIN));

    echo YELLOW . "Enter ascendancy (or leave empty): " . RESET;
    $ascendancy = trim(fgets(STDIN));

    echo YELLOW . "Enter main skill (or leave empty): " . RESET;
    $skill = trim(fgets(STDIN));

    echo YELLOW . "Enter budget (Low/Medium/High/Very High): " . RESET;
    $budget = trim(fgets(STDIN));

    $selectedScenario = [
        'name' => 'Custom Build',
        'request' => $customRequest,
        'context' => array_filter([
            'ascendancy' => $ascendancy ?: null,
            'main_skill' => $skill ?: null,
            'budget' => $budget ?: 'Medium',
            'content_focus' => 'General content'
        ])
    ];
} elseif (is_numeric($input) && $input >= 1 && $input <= count($scenarios)) {
    $selectedScenario = $scenarios[$input - 1];
} else {
    echo RED . "Invalid selection. Using default scenario.\n" . RESET;
    $selectedScenario = $scenarios[0];
}

echo "\n";
echo CYAN . "╔═══════════════════════════════════════════════════════╗\n" . RESET;
echo CYAN . "║  Generating Build: " . str_pad($selectedScenario['name'], 35) . "║\n" . RESET;
echo CYAN . "╚═══════════════════════════════════════════════════════╝\n" . RESET;
echo "\n";

echo YELLOW . "User Request:\n" . RESET;
echo "  " . $selectedScenario['request'] . "\n\n";

echo YELLOW . "Context:\n" . RESET;
foreach ($selectedScenario['context'] as $key => $value) {
    echo "  " . ucfirst(str_replace('_', ' ', $key)) . ": " . CYAN . $value . RESET . "\n";
}

echo "\n" . YELLOW . "Calling AI Service..." . RESET . "\n";
echo "(This may take 5-10 seconds)\n\n";

$startTime = microtime(true);

try {
    $buildData = $aiService->generateBuild(
        $selectedScenario['request'],
        $selectedScenario['context']
    );

    $endTime = microtime(true);
    $duration = round($endTime - $startTime, 2);

    if ($buildData) {
        echo GREEN . "✓ Build generated successfully in {$duration}s\n" . RESET;
        echo "\n";

        // Display build
        echo BLUE . "╔═══════════════════════════════════════════════════════╗\n" . RESET;
        echo BLUE . "║  BUILD DETAILS\n" . RESET;
        echo BLUE . "╚═══════════════════════════════════════════════════════╝\n" . RESET;
        echo "\n";

        echo YELLOW . "Name: " . RESET . MAGENTA . ($buildData['build_name'] ?? 'Unnamed') . RESET . "\n";
        echo YELLOW . "Class: " . RESET . CYAN . ($buildData['ascendancy_class'] ?? 'Unknown') . RESET . "\n";
        echo YELLOW . "Main Skill: " . RESET . GREEN . ($buildData['main_skill'] ?? 'Unknown') . RESET . "\n";

        if (isset($buildData['playstyle'])) {
            echo YELLOW . "Playstyle: " . RESET . $buildData['playstyle'] . "\n";
        }

        // Items
        if (isset($buildData['items']) && is_array($buildData['items'])) {
            echo "\n" . BLUE . "═══ ITEMS (" . count($buildData['items']) . ") ═══\n" . RESET;
            foreach ($buildData['items'] as $item) {
                $rarity = $item['rarity'] ?? 'normal';
                $color = $rarity === 'unique' ? YELLOW : ($rarity === 'rare' ? YELLOW : RESET);

                echo "  " . $color . "▸ " . ($item['slot'] ?? 'Unknown') . ": " . ($item['name'] ?? 'Unknown') . RESET . "\n";

                if (!empty($item['required_stats'])) {
                    foreach ($item['required_stats'] as $stat) {
                        echo "    • " . GREEN . $stat . RESET . "\n";
                    }
                }
            }
        }

        // Skill Gems
        if (isset($buildData['skill_gems']) && is_array($buildData['skill_gems'])) {
            echo "\n" . BLUE . "═══ SKILL GEMS ═══\n" . RESET;
            foreach ($buildData['skill_gems'] as $linkGroup) {
                echo "  " . CYAN . ($linkGroup['link_group'] ?? 'Link Group') . RESET;
                if (isset($linkGroup['socket_colors'])) {
                    echo " (" . $linkGroup['socket_colors'] . ")";
                }
                echo ":\n";

                if (isset($linkGroup['gems']) && is_array($linkGroup['gems'])) {
                    foreach ($linkGroup['gems'] as $gem) {
                        echo "    • " . GREEN . $gem . RESET . "\n";
                    }
                }
            }
        }

        // Flasks
        if (isset($buildData['flasks']) && is_array($buildData['flasks'])) {
            echo "\n" . BLUE . "═══ FLASKS ═══\n" . RESET;
            foreach ($buildData['flasks'] as $flask) {
                echo "  • " . MAGENTA . $flask . RESET . "\n";
            }
        }

        // Jewels
        if (isset($buildData['jewels']) && is_array($buildData['jewels'])) {
            echo "\n" . BLUE . "═══ JEWELS ═══\n" . RESET;
            foreach ($buildData['jewels'] as $jewel) {
                echo "  " . CYAN . ($jewel['type'] ?? 'Jewel') . RESET . "\n";
                if (!empty($jewel['priority_stats'])) {
                    foreach ($jewel['priority_stats'] as $stat) {
                        echo "    • " . GREEN . $stat . RESET . "\n";
                    }
                }
            }
        }

        // Strengths & Weaknesses
        if (isset($buildData['strengths']) || isset($buildData['weaknesses'])) {
            echo "\n" . BLUE . "═══ ANALYSIS ═══\n" . RESET;

            if (isset($buildData['strengths'])) {
                echo GREEN . "  Strengths:\n" . RESET;
                foreach ($buildData['strengths'] as $strength) {
                    echo "    ✓ " . $strength . "\n";
                }
            }

            if (isset($buildData['weaknesses'])) {
                echo "\n" . RED . "  Weaknesses:\n" . RESET;
                foreach ($buildData['weaknesses'] as $weakness) {
                    echo "    ✗ " . $weakness . "\n";
                }
            }
        }

        echo "\n";
        echo GREEN . "╔═══════════════════════════════════════════════════════╗\n" . RESET;
        echo GREEN . "║  Build generation complete!\n" . RESET;
        echo GREEN . "╚═══════════════════════════════════════════════════════╝\n" . RESET;

        // Saving option
        echo "\n" . YELLOW . "Would you like to see the raw JSON? (y/n): " . RESET;
        $showJson = trim(fgets(STDIN));

        if (strtolower($showJson) === 'y') {
            echo "\n" . BLUE . "═══ RAW JSON ═══\n" . RESET;
            echo json_encode($buildData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            echo "\n";
        }

    } else {
        echo RED . "✗ Failed to generate build\n" . RESET;
        echo "The AI service returned null. Check logs for details.\n";
    }

} catch (Exception $e) {
    echo RED . "✗ Error: " . $e->getMessage() . "\n" . RESET;
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n";
echo CYAN . "═══════════════════════════════════════════════════════\n" . RESET;
echo YELLOW . "How this works in the application:\n" . RESET;
echo "\n";
echo "1. User goes to " . CYAN . "/build/create" . RESET . "\n";
echo "2. User describes their desired build in plain English\n";
echo "3. AI Service generates complete build data\n";
echo "4. Build is saved to database with user_id\n";
echo "5. User can edit, export to POB, or share\n";
echo "\n";
echo YELLOW . "API Status:\n" . RESET;
$apiKey = $_ENV['GEMINI_API_KEY'] ?? 'not_configured';
if ($apiKey === 'your_api_key_here' || $apiKey === 'not_configured') {
    echo RED . "  ⚠ Using mock data (API key not configured)\n" . RESET;
    echo "  See GEMINI_API_SETUP.md for API activation instructions\n";
} else {
    echo GREEN . "  ✓ API key configured\n" . RESET;
    echo "  Note: 403 errors will fall back to mock data automatically\n";
}
echo "\n";
