<?php

/**
 * External Services Configuration
 */

return [
    'gemini' => [
        'api_key' => $_ENV['GEMINI_API_KEY'] ?? '',
        'endpoint' => 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        'model' => 'gemini-pro',
        'temperature' => 0.7,
        'max_tokens' => 2048,
    ],

    'poe_ninja' => [
        'api_url' => $_ENV['POE_NINJA_API_URL'] ?? 'https://poe.ninja/api/data',
        'cache_duration' => 3600, // 1 hour
    ],

    'scraper' => [
        'delay' => (int)($_ENV['SCRAPER_DELAY'] ?? 2),
        'user_agent' => $_ENV['SCRAPER_USER_AGENT'] ?? 'ExileArchitect/1.0',
        'timeout' => 30,
        'sources' => [
            'poedb' => 'https://poedb.tw',
            'poewiki' => 'https://www.poewiki.net',
        ],
    ],
];
