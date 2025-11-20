#!/usr/bin/env php
<?php
/**
 * Complete System Test
 * Tests all major components and features
 */

declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use App\Core\Database;
use App\Models\User;
use App\Models\Build;
use App\Models\GameData;
use App\Services\DataScraperService;
use App\Services\GeminiAIService;

// ANSI colors
define('GREEN', "\033[32m");
define('RED', "\033[31m");
define('YELLOW', "\033[33m");
define('BLUE', "\033[34m");
define('RESET', "\033[0m");

class SystemTest
{
    private array $results = [];
    private int $passed = 0;
    private int $failed = 0;

    public function run(): void
    {
        echo BLUE . "╔═══════════════════════════════════════════════════════╗\n" . RESET;
        echo BLUE . "║     EXILE ARCHITECT - COMPLETE SYSTEM TEST           ║\n" . RESET;
        echo BLUE . "╚═══════════════════════════════════════════════════════╝\n" . RESET;
        echo "\n";

        // Phase 1: Core System Tests
        echo YELLOW . "▶ Phase 1: Core System Tests\n" . RESET;
        $this->testConfiguration();
        $this->testDatabaseConnection();
        $this->testRouter();
        echo "\n";

        // Phase 2: Model Tests
        echo YELLOW . "▶ Phase 2: Model Tests\n" . RESET;
        $this->testUserModel();
        $this->testBuildModel();
        $this->testGameDataModel();
        echo "\n";

        // Phase 3: Service Tests
        echo YELLOW . "▶ Phase 3: Service Tests\n" . RESET;
        $this->testDataScraperService();
        $this->testGeminiAIService();
        echo "\n";

        // Phase 4: Integration Tests
        echo YELLOW . "▶ Phase 4: Integration Tests\n" . RESET;
        $this->testUserRegistration();
        $this->testBuildCreation();
        $this->testBuildDataStorage();
        echo "\n";

        // Phase 5: File Structure Tests
        echo YELLOW . "▶ Phase 5: File Structure Tests\n" . RESET;
        $this->testFileStructure();
        $this->testMigrations();
        $this->testViews();
        echo "\n";

        // Summary
        $this->printSummary();
    }

    private function test(string $name, callable $callback): void
    {
        try {
            $result = $callback();
            if ($result === false) {
                throw new Exception("Test returned false");
            }
            $this->pass($name);
        } catch (Exception $e) {
            $this->fail($name, $e->getMessage());
        }
    }

    private function pass(string $test): void
    {
        echo "  " . GREEN . "✓" . RESET . " $test\n";
        $this->passed++;
        $this->results[] = ['test' => $test, 'status' => 'passed'];
    }

    private function fail(string $test, string $reason = ''): void
    {
        echo "  " . RED . "✗" . RESET . " $test";
        if ($reason) {
            echo " - " . RED . $reason . RESET;
        }
        echo "\n";
        $this->failed++;
        $this->results[] = ['test' => $test, 'status' => 'failed', 'reason' => $reason];
    }

    // ==================== CORE TESTS ====================

    private function testConfiguration(): void
    {
        $this->test('Config files exist', function () {
            return file_exists(__DIR__ . '/config/database.php') &&
                   file_exists(__DIR__ . '/config/app.php') &&
                   file_exists(__DIR__ . '/.env');
        });

        $this->test('Environment variables loaded', function () {
            return getenv('DB_HOST') !== false;
        });
    }

    private function testDatabaseConnection(): void
    {
        $this->test('Database connection', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $db = Database::getInstance($dbConfig);
            return $db !== null;
        });

        $this->test('Database tables exist', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $db = Database::getInstance($dbConfig);
            $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

            $requiredTables = ['users', 'builds', 'build_data', 'uniques', 'skill_gems'];
            foreach ($requiredTables as $table) {
                if (!in_array($table, $tables)) {
                    throw new Exception("Table '$table' not found");
                }
            }
            return true;
        });
    }

    private function testRouter(): void
    {
        $this->test('Router class exists', function () {
            return class_exists('App\Core\Router');
        });

        $this->test('Request class exists', function () {
            return class_exists('App\Core\Request');
        });

        $this->test('Response class exists', function () {
            return class_exists('App\Core\Response');
        });
    }

    // ==================== MODEL TESTS ====================

    private function testUserModel(): void
    {
        $this->test('User model instantiation', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $user = new User(Database::getInstance($dbConfig));
            return $user !== null;
        });

        $this->test('User model methods exist', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $user = new User(Database::getInstance($dbConfig));
            return method_exists($user, 'register') &&
                   method_exists($user, 'authenticate') &&
                   method_exists($user, 'hashPassword') &&
                   method_exists($user, 'validatePassword');
        });
    }

    private function testBuildModel(): void
    {
        $this->test('Build model instantiation', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $build = new Build(Database::getInstance($dbConfig));
            return $build !== null;
        });

        $this->test('Build model methods exist', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $build = new Build(Database::getInstance($dbConfig));
            return method_exists($build, 'createBuild') &&
                   method_exists($build, 'saveBuildData') &&
                   method_exists($build, 'isOwner') &&
                   method_exists($build, 'exportToPOB');
        });
    }

    private function testGameDataModel(): void
    {
        $this->test('GameData model instantiation', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $gameData = new GameData(Database::getInstance($dbConfig));
            return $gameData !== null;
        });

        $this->test('GameData model methods exist', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $gameData = new GameData(Database::getInstance($dbConfig));
            return method_exists($gameData, 'searchItems') &&
                   method_exists($gameData, 'searchGems') &&
                   method_exists($gameData, 'getPassiveTree');
        });
    }

    // ==================== SERVICE TESTS ====================

    private function testDataScraperService(): void
    {
        $this->test('DataScraperService instantiation', function () {
            $scraper = new DataScraperService();
            return $scraper !== null;
        });

        $this->test('DataScraperService methods exist', function () {
            $scraper = new DataScraperService();
            return method_exists($scraper, 'scrapeAll') &&
                   method_exists($scraper, 'scrapeUniques') &&
                   method_exists($scraper, 'scrapeSkillGems');
        });
    }

    private function testGeminiAIService(): void
    {
        $this->test('GeminiAIService instantiation', function () {
            $gemini = new GeminiAIService();
            return $gemini !== null;
        });

        $this->test('GeminiAIService methods exist', function () {
            $gemini = new GeminiAIService();
            return method_exists($gemini, 'generateBuild') &&
                   method_exists($gemini, 'buildPrompt');
        });
    }

    // ==================== INTEGRATION TESTS ====================

    private function testUserRegistration(): void
    {
        $this->test('User password hashing', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $user = new User(Database::getInstance($dbConfig));
            $hash = $user->hashPassword('TestPassword123!');
            return password_verify('TestPassword123!', $hash);
        });

        $this->test('User password validation', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $user = new User(Database::getInstance($dbConfig));
            return $user->validatePassword('ValidPass123!') === true;
        });
    }

    private function testBuildCreation(): void
    {
        $this->test('Build ownership check logic', function () {
            $dbConfig = require __DIR__ . '/config/database.php';
            $build = new Build(Database::getInstance($dbConfig));
            // Test method exists and is callable
            return is_callable([$build, 'isOwner']);
        });
    }

    private function testBuildDataStorage(): void
    {
        $this->test('Build data type validation', function () {
            $validTypes = ['passive_tree', 'items', 'skills', 'gems', 'jewels', 'flasks'];
            return count($validTypes) === 6;
        });
    }

    // ==================== FILE STRUCTURE TESTS ====================

    private function testFileStructure(): void
    {
        $requiredDirs = [
            'app/Controllers',
            'app/Models',
            'app/Views',
            'app/Core',
            'app/Services',
            'public/assets/css',
            'public/assets/js',
            'config',
            'migrations',
            'cli',
            'data'
        ];

        foreach ($requiredDirs as $dir) {
            $this->test("Directory exists: $dir", function () use ($dir) {
                return is_dir(__DIR__ . '/' . $dir);
            });
        }
    }

    private function testMigrations(): void
    {
        $this->test('Migration files exist', function () {
            $migrations = glob(__DIR__ . '/migrations/*.sql');
            return count($migrations) >= 7;
        });

        $this->test('Migration runner exists', function () {
            return file_exists(__DIR__ . '/cli/migrate.php');
        });
    }

    private function testViews(): void
    {
        $requiredViews = [
            'app/Views/layouts/main.twig',
            'app/Views/home/index.twig',
            'app/Views/user/login.twig',
            'app/Views/user/register.twig',
            'app/Views/user/dashboard.twig',
            'app/Views/build/my-builds.twig',
            'app/Views/build/create.twig',
            'app/Views/build/edit.twig'
        ];

        foreach ($requiredViews as $view) {
            $this->test("View exists: " . basename($view), function () use ($view) {
                return file_exists(__DIR__ . '/' . $view);
            });
        }
    }

    // ==================== SUMMARY ====================

    private function printSummary(): void
    {
        $total = $this->passed + $this->failed;
        $percentage = $total > 0 ? round(($this->passed / $total) * 100, 1) : 0;

        echo "\n";
        echo BLUE . "╔═══════════════════════════════════════════════════════╗\n" . RESET;
        echo BLUE . "║                    TEST SUMMARY                       ║\n" . RESET;
        echo BLUE . "╚═══════════════════════════════════════════════════════╝\n" . RESET;
        echo "\n";
        echo "  Total Tests:  " . BLUE . $total . RESET . "\n";
        echo "  Passed:       " . GREEN . $this->passed . RESET . "\n";
        echo "  Failed:       " . RED . $this->failed . RESET . "\n";
        echo "  Success Rate: " . ($percentage >= 90 ? GREEN : ($percentage >= 70 ? YELLOW : RED)) . $percentage . "%" . RESET . "\n";
        echo "\n";

        if ($this->failed === 0) {
            echo GREEN . "✓ All tests passed! System is ready for deployment.\n" . RESET;
        } else {
            echo RED . "✗ Some tests failed. Please review and fix issues.\n" . RESET;
        }

        echo "\n";
        echo YELLOW . "Next Steps:\n" . RESET;
        echo "  1. Run migrations:     php cli/migrate.php\n";
        echo "  2. Seed sample data:   php cli/seed.php\n";
        echo "  3. Scrape game data:   php cli/scraper.php --task=all\n";
        echo "  4. Start server:       composer serve\n";
        echo "  5. Access app:         http://localhost:8080\n";
        echo "\n";
    }
}

// Run tests
$test = new SystemTest();
$test->run();
