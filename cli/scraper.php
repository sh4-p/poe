#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Data Scraper CLI
 * Scrapes PoE data from various sources
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Services\DataScraperService;
use Dotenv\Dotenv;

// Load environment variables
try {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
} catch (Exception $e) {
    echo "Warning: .env file not found\n";
}

// Parse command line arguments
$options = getopt('', ['task:', 'version:', 'clear', 'help']);

if (isset($options['help'])) {
    showHelp();
    exit(0);
}

$task = $options['task'] ?? 'all';
$version = $options['version'] ?? '3.25';
$clear = isset($options['clear']);

echo "\n";
echo "╔════════════════════════════════════════════════╗\n";
echo "║     Exile Architect - Data Scraper CLI         ║\n";
echo "╚════════════════════════════════════════════════╝\n";
echo "\n";

try {
    $scraper = new DataScraperService();

    // Clear old data if requested
    if ($clear) {
        echo "🗑️  Clearing old data...\n\n";
        $scraper->clearData($version);
        echo "\n";
    }

    // Execute task
    switch ($task) {
        case 'all':
            echo "📦 Running all scraping tasks...\n\n";
            $results = $scraper->scrapeAll($version);
            break;

        case 'tree':
            echo "📊 Scraping passive tree...\n\n";
            $result = $scraper->scrapePassiveTree($version);
            echo $result ? "\n✅ Success!\n" : "\n❌ Failed!\n";
            break;

        case 'uniques':
            echo "🔮 Scraping unique items...\n\n";
            $count = $scraper->scrapeUniques($version);
            echo "\n✅ Scraped {$count} unique items\n";
            break;

        case 'gems':
            echo "💎 Scraping skill gems...\n\n";
            $count = $scraper->scrapeSkillGems($version);
            echo "\n✅ Scraped {$count} skill gems\n";
            break;

        case 'bases':
            echo "⚔️  Scraping base items...\n\n";
            $count = $scraper->scrapeBaseItems($version);
            echo "\n✅ Scraped {$count} base items\n";
            break;

        case 'poeninja':
            echo "📈 Fetching poe.ninja data...\n\n";
            $result = $scraper->fetchPoeNinjaData();
            echo $result ? "\n✅ Success!\n" : "\n❌ Failed!\n";
            break;

        default:
            echo "❌ Unknown task: {$task}\n";
            echo "Run with --help to see available tasks\n";
            exit(1);
    }

    echo "\n";
    echo "╔════════════════════════════════════════════════╗\n";
    echo "║              Scraping Complete!                ║\n";
    echo "╚════════════════════════════════════════════════╝\n";
    echo "\n";

} catch (Exception $e) {
    echo "\n";
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "\n";
    exit(1);
}

/**
 * Show help message
 */
function showHelp(): void
{
    echo <<<HELP

╔════════════════════════════════════════════════╗
║     Exile Architect - Data Scraper CLI         ║
╚════════════════════════════════════════════════╝

USAGE:
  php cli/scraper.php [options]

OPTIONS:
  --task=<task>      Task to run (default: all)
  --version=<ver>    PoE version (default: 3.25)
  --clear            Clear old data before scraping
  --help             Show this help message

AVAILABLE TASKS:
  all                Run all scraping tasks
  tree               Scrape passive skill tree
  uniques            Scrape unique items
  gems               Scrape skill gems
  bases              Scrape base items
  poeninja           Fetch data from poe.ninja

EXAMPLES:
  # Scrape all data for version 3.25
  php cli/scraper.php --task=all --version=3.25

  # Scrape only unique items
  php cli/scraper.php --task=uniques

  # Clear old data and rescrape everything
  php cli/scraper.php --task=all --clear

  # Fetch poe.ninja data
  php cli/scraper.php --task=poeninja

NOTES:
  - Respects rate limits (2 second delay between requests)
  - Sample data is used for demonstration
  - In production, implement real web scraping
  - Check logs for detailed error messages

HELP;
}
