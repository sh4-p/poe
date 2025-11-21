<?php

/**
 * Application Configuration
 */

return [
    'name' => $_ENV['APP_NAME'] ?? 'Exile Architect',
    'env' => $_ENV['APP_ENV'] ?? 'local',
    'debug' => filter_var($_ENV['APP_DEBUG'] ?? true, FILTER_VALIDATE_BOOLEAN),
    'url' => $_ENV['APP_URL'] ?? 'http://localhost:8080',
    'timezone' => 'UTC',

    'session' => [
        'driver' => $_ENV['SESSION_DRIVER'] ?? 'file',
        'lifetime' => (int)($_ENV['SESSION_LIFETIME'] ?? 120),
        'path' => '/',
        'domain' => null,
        'secure' => $_ENV['APP_ENV'] === 'production',
        'httponly' => true,
        'samesite' => 'Lax',
    ],

    'cache' => [
        'driver' => $_ENV['CACHE_DRIVER'] ?? 'file',
        'path' => __DIR__ . '/../storage/cache',
    ],
];
