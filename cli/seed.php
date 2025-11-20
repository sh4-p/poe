#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Database Seeder
 * Populates database with sample data for testing
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;
use App\Models\User;
use App\Models\Build;
use Dotenv\Dotenv;

// Load environment
try {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
} catch (Exception $e) {
    echo "Warning: .env file not found\n";
}

echo "\n";
echo "╔════════════════════════════════════════════════╗\n";
echo "║         Database Seeder - Sample Data          ║\n";
echo "╚════════════════════════════════════════════════╝\n";
echo "\n";

try {
    // Connect to database
    $dbConfig = require __DIR__ . '/../config/database.php';
    $db = Database::getInstance($dbConfig);

    echo "✓ Connected to database\n\n";

    // Seed users
    echo "👥 Seeding users...\n";
    $userModel = new User();

    $users = [
        [
            'username' => 'demo_user',
            'email' => 'demo@exilearchitect.com',
            'password' => 'Demo123!'
        ],
        [
            'username' => 'tester',
            'email' => 'test@exilearchitect.com',
            'password' => 'Test123!'
        ]
    ];

    $userIds = [];
    foreach ($users as $userData) {
        try {
            $userId = $userModel->register($userData);
            if ($userId) {
                echo "  ✓ Created user: {$userData['username']} (ID: {$userId})\n";
                $userIds[] = $userId;
            }
        } catch (Exception $e) {
            echo "  ℹ User {$userData['username']} may already exist\n";
            $existing = $userModel->findByEmail($userData['email']);
            if ($existing) {
                $userIds[] = $existing['id'];
            }
        }
    }

    echo "\n";

    // Seed builds
    if (!empty($userIds)) {
        echo "🏗️  Seeding builds...\n";
        $buildModel = new Build();

        $builds = [
            [
                'user_id' => $userIds[0],
                'build_name' => 'Righteous Fire Juggernaut',
                'ascendancy_class' => 'Juggernaut',
                'poe_version' => '3.25',
                'is_public' => true
            ],
            [
                'user_id' => $userIds[0],
                'build_name' => 'Detonate Dead Necromancer',
                'ascendancy_class' => 'Necromancer',
                'poe_version' => '3.25',
                'is_public' => true
            ],
            [
                'user_id' => count($userIds) > 1 ? $userIds[1] : $userIds[0],
                'build_name' => 'Cyclone Slayer',
                'ascendancy_class' => 'Slayer',
                'poe_version' => '3.25',
                'is_public' => false
            ],
            [
                'user_id' => count($userIds) > 1 ? $userIds[1] : $userIds[0],
                'build_name' => 'Explosive Arrow Elementalist',
                'ascendancy_class' => 'Elementalist',
                'poe_version' => '3.25',
                'is_public' => true
            ]
        ];

        foreach ($builds as $buildData) {
            try {
                $buildId = $buildModel->create($buildData);
                if ($buildId) {
                    echo "  ✓ Created build: {$buildData['build_name']} (ID: {$buildId})\n";

                    // Add sample build data
                    $buildModel->saveBuildData($buildId, 'items', [
                        ['slot' => 'Weapon', 'name' => 'Rare Sceptre'],
                        ['slot' => 'Shield', 'name' => 'Rise of the Phoenix']
                    ]);

                    $buildModel->saveBuildData($buildId, 'gems', [
                        [
                            'link_group' => '4-Link',
                            'gems' => ['Righteous Fire', 'Elemental Focus', 'Burning Damage', 'Concentrated Effect']
                        ]
                    ]);
                }
            } catch (Exception $e) {
                echo "  ✗ Failed to create build: {$buildData['build_name']}\n";
            }
        }
    }

    echo "\n";
    echo "╔════════════════════════════════════════════════╗\n";
    echo "║            Seeding Complete!                   ║\n";
    echo "╚════════════════════════════════════════════════╝\n";
    echo "\n";
    echo "📝 Sample Credentials:\n";
    echo "   Email: demo@exilearchitect.com\n";
    echo "   Password: Demo123!\n";
    echo "\n";

} catch (Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n\n";
    exit(1);
}
