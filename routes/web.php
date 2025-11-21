<?php

declare(strict_types=1);

/**
 * Web Routes
 * Define all HTTP routes here
 *
 * @var \App\Core\Router $router
 */

// ============================================
// Public Routes
// ============================================

// Home
$router->get('/', 'HomeController@index');
$router->get('/about', 'HomeController@about');
$router->get('/features', 'HomeController@features');

// Authentication
$router->get('/login', 'UserController@showLogin');
$router->post('/login', 'UserController@login');
$router->get('/register', 'UserController@showRegister');
$router->post('/register', 'UserController@register');
$router->post('/logout', 'UserController@logout');

// Public builds
$router->get('/builds', 'BuildController@index');
$router->get('/build/{id}', 'BuildController@view');

// ============================================
// Protected Routes (require authentication)
// ============================================

// User dashboard
$router->get('/dashboard', 'UserController@dashboard');
$router->get('/profile', 'UserController@profile');

// Build management
$router->get('/my-builds', 'BuildController@myBuilds');
$router->get('/build/new', 'BuildController@new');
$router->get('/build/{id}/edit', 'BuildController@edit');
$router->post('/build/save', 'BuildController@save');
$router->post('/build/{id}/delete', 'BuildController@delete');

// Build import/export
$router->get('/build/import', 'BuildController@showImport');
$router->post('/build/import', 'BuildController@import');
$router->get('/build/{id}/export', 'BuildController@export');

// ============================================
// API Routes (AJAX endpoints)
// ============================================

// Items
$router->get('/api/items', 'ApiController@getItems');
$router->get('/api/items/{id}', 'ApiController@getItemDetails');

// Passive tree
$router->get('/api/passive-tree', 'ApiController@passiveTree');

// Skill gems
$router->get('/api/skill-gems', 'ApiController@getSkillGems');

// AI build generation
$router->post('/api/generate-build', 'ApiController@generateBuildWithAI');

// Search
$router->get('/api/search/uniques', 'ApiController@searchUniques');
$router->get('/api/search/gems', 'ApiController@searchGems');

// ============================================
// Development/Testing Routes (remove in production)
// ============================================

if ($_ENV['APP_ENV'] === 'local') {
    $router->get('/test', 'HomeController@test');
}
