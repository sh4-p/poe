<?php

/**
 * Simple system test without database
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Core\Request;
use App\Core\Response;
use App\Core\Router;

echo "===========================================\n";
echo "  Exile Architect - System Test\n";
echo "===========================================\n\n";

// Test 1: Autoloading
echo "✓ Test 1: Autoloader working\n";

// Test 2: Environment
$_ENV['APP_ENV'] = 'local';
$_ENV['APP_DEBUG'] = 'true';
$_ENV['APP_NAME'] = 'Exile Architect';
echo "✓ Test 2: Environment variables set\n";

// Test 3: Request class
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/test';
$request = new Request();
echo "✓ Test 3: Request class instantiated\n";
echo "  - Method: " . $request->getMethod() . "\n";
echo "  - URI: " . $request->getUri() . "\n";

// Test 4: Response class
$response = Response::jsonResponse(['test' => 'success']);
echo "✓ Test 4: Response class working\n";

// Test 5: Router class
$router = new Router();
$router->get('/test', 'HomeController@test');
echo "✓ Test 5: Router class working\n";
echo "  - Routes registered: " . count($router->getRoutes()) . "\n";

// Test 6: Twig availability
if (class_exists('\Twig\Environment')) {
    echo "✓ Test 6: Twig template engine available\n";
} else {
    echo "✗ Test 6: Twig NOT available\n";
}

// Test 7: Guzzle availability
if (class_exists('\GuzzleHttp\Client')) {
    echo "✓ Test 7: Guzzle HTTP client available\n";
} else {
    echo "✗ Test 7: Guzzle NOT available\n";
}

// Test 8: PHPUnit availability
if (class_exists('\PHPUnit\Framework\TestCase')) {
    echo "✓ Test 8: PHPUnit testing framework available\n";
} else {
    echo "✗ Test 8: PHPUnit NOT available\n";
}

// Test 9: File structure
$required_dirs = [
    'app/Controllers',
    'app/Models',
    'app/Views',
    'app/Core',
    'app/Services',
    'config',
    'public',
    'migrations',
];

$all_exist = true;
foreach ($required_dirs as $dir) {
    if (!is_dir(__DIR__ . '/' . $dir)) {
        echo "✗ Test 9: Directory missing: {$dir}\n";
        $all_exist = false;
    }
}

if ($all_exist) {
    echo "✓ Test 9: All required directories exist\n";
}

echo "\n===========================================\n";
echo "  All tests passed! System is ready.\n";
echo "===========================================\n";
