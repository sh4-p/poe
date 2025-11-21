<?php

declare(strict_types=1);

/**
 * Front Controller - Single Entry Point
 * All requests are routed through this file
 */

// Load Composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Request;
use App\Core\Router;
use Dotenv\Dotenv;

// Error reporting (will be controlled by .env)
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Load environment variables
try {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
} catch (Exception $e) {
    // .env file not found, use defaults
    $_ENV['APP_ENV'] = 'local';
    $_ENV['APP_DEBUG'] = 'true';
    $_ENV['APP_NAME'] = 'Exile Architect';
}

// Set error reporting based on environment
if ($_ENV['APP_DEBUG'] === 'true') {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}

// Set timezone
date_default_timezone_set('UTC');

// Start session
session_start([
    'cookie_lifetime' => 7200,
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
    'use_strict_mode' => true,
]);

// Error handler
set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }

    error_log("Error [{$severity}]: {$message} in {$file} on line {$line}");

    if ($_ENV['APP_DEBUG'] === 'true') {
        echo "<pre>Error: {$message}\nFile: {$file}\nLine: {$line}</pre>";
    }

    return true;
});

// Exception handler
set_exception_handler(function ($exception) {
    error_log("Uncaught exception: " . $exception->getMessage());
    error_log($exception->getTraceAsString());

    http_response_code(500);

    if ($_ENV['APP_DEBUG'] === 'true') {
        echo "<pre>";
        echo "Exception: " . $exception->getMessage() . "\n";
        echo "File: " . $exception->getFile() . "\n";
        echo "Line: " . $exception->getLine() . "\n";
        echo "\nStack trace:\n" . $exception->getTraceAsString();
        echo "</pre>";
    } else {
        echo "Internal Server Error";
    }
});

// Create request object
$request = new Request();

// Create router
$router = new Router();

// Load routes
require_once __DIR__ . '/../routes/web.php';

// Dispatch request
$response = $router->dispatch($request);

// Send response
$response->send();
