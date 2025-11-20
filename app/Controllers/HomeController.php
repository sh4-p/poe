<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Response;

/**
 * Home Controller
 * Handles homepage and public pages
 */
class HomeController extends BaseController
{
    /**
     * Display homepage
     */
    public function index(): Response
    {
        return $this->render('home/index.twig', [
            'title' => 'Welcome to Exile Architect',
            'description' => 'Advanced Path of Exile Build Planner with AI Integration'
        ]);
    }

    /**
     * Display about page
     */
    public function about(): Response
    {
        return $this->render('home/about.twig', [
            'title' => 'About Exile Architect'
        ]);
    }

    /**
     * Display features page
     */
    public function features(): Response
    {
        $features = [
            [
                'title' => 'Interactive Passive Tree',
                'description' => 'Visualize and plan your skill tree with an intuitive interface',
                'icon' => '🌳'
            ],
            [
                'title' => 'AI Build Generation',
                'description' => 'Generate optimized builds using advanced AI technology',
                'icon' => '🤖'
            ],
            [
                'title' => 'Item Database',
                'description' => 'Comprehensive database of all uniques, bases, and gems',
                'icon' => '📦'
            ],
            [
                'title' => 'Build Import/Export',
                'description' => 'Compatible with Path of Building for seamless workflow',
                'icon' => '🔄'
            ],
            [
                'title' => 'Mobile Responsive',
                'description' => 'Plan builds on any device, anywhere, anytime',
                'icon' => '📱'
            ],
            [
                'title' => 'Real-time Data',
                'description' => 'Always up-to-date with the latest game changes',
                'icon' => '⚡'
            ]
        ];

        return $this->render('home/features.twig', [
            'title' => 'Features',
            'features' => $features
        ]);
    }

    /**
     * Test endpoint (development only)
     */
    public function test(): Response
    {
        return $this->json([
            'status' => 'success',
            'message' => 'MVC framework is working!',
            'environment' => $_ENV['APP_ENV'] ?? 'unknown',
            'debug' => $_ENV['APP_DEBUG'] ?? 'false',
            'php_version' => PHP_VERSION,
            'request_method' => $this->request->getMethod(),
            'request_uri' => $this->request->getUri()
        ]);
    }
}
