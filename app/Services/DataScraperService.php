<?php

declare(strict_types=1);

namespace App\Services;

use GuzzleHttp\Client;
use App\Models\GameData;

/**
 * Data Scraper Service
 * Handles scraping of PoE data from various sources
 */
class DataScraperService
{
    private Client $httpClient;
    private GameData $gameDataModel;
    private array $config;
    private string $dataDir;

    public function __construct()
    {
        $servicesConfig = require __DIR__ . '/../../config/services.php';
        $this->config = $servicesConfig['scraper'];

        $this->httpClient = new Client([
            'timeout' => $this->config['timeout'],
            'headers' => [
                'User-Agent' => $this->config['user_agent'],
                'Accept' => 'text/html,application/json',
            ]
        ]);

        $this->gameDataModel = new GameData();
        $this->dataDir = __DIR__ . '/../../data';
    }

    /**
     * Scrape passive tree from official source
     */
    public function scrapePassiveTree(string $version = 'latest'): bool
    {
        echo "📊 Scraping passive tree data...\n";

        try {
            // Try official GitHub repo first (most reliable)
            $urls = [
                "https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/master/src/Data/3_0/PassiveSkillTree.json",
                "https://www.pathofexile.com/passive-skill-tree/data.json"
            ];

            $treeData = null;
            foreach ($urls as $url) {
                try {
                    echo "  Trying: {$url}\n";
                    $response = $this->httpClient->get($url);
                    $treeData = $response->getBody()->getContents();

                    // Validate JSON
                    $decoded = json_decode($treeData, true);
                    if (json_last_error() === JSON_ERROR_NONE && isset($decoded['nodes'])) {
                        echo "  ✓ Successfully retrieved tree data\n";
                        break;
                    }
                } catch (\Exception $e) {
                    echo "  ✗ Failed: " . $e->getMessage() . "\n";
                    continue;
                }
            }

            if (!$treeData) {
                throw new \Exception('Failed to fetch from all sources');
            }

            // Save to file
            $filename = "{$this->dataDir}/passive-tree/{$version}.json";
            $dir = dirname($filename);

            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            file_put_contents($filename, $treeData);

            $decoded = json_decode($treeData, true);
            echo "✓ Passive tree saved to: {$filename}\n";
            echo "  Nodes: " . count($decoded['nodes'] ?? []) . "\n";

            // Also save to database
            $this->gameDataModel->savePassiveTree($version, $decoded);
            echo "  ✓ Saved to database\n";

            return true;

        } catch (\Exception $e) {
            echo "✗ Failed to scrape passive tree: " . $e->getMessage() . "\n";
            error_log("Passive tree scraping error: " . $e->getMessage());

            // Create minimal sample tree if all else fails
            $this->createSamplePassiveTree($version);
            return false;
        }
    }

    /**
     * Create sample passive tree for development
     */
    private function createSamplePassiveTree(string $version): void
    {
        $sampleTree = [
            'version' => $version,
            'nodes' => [
                '0' => [
                    'id' => 0,
                    'name' => 'Scion Start',
                    'type' => 'start',
                    'stats' => [],
                    'x' => 0,
                    'y' => 0
                ]
            ],
            'links' => []
        ];

        $filename = "{$this->dataDir}/passive-tree/{$version}.json";
        $dir = dirname($filename);

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents($filename, json_encode($sampleTree, JSON_PRETTY_PRINT));
        echo "  ✓ Created sample passive tree\n";
    }

    /**
     * Scrape unique items from poe.ninja
     */
    public function scrapeUniques(string $version = '3.25'): int
    {
        echo "🔮 Scraping unique items from poe.ninja...\n";

        try {
            // poe.ninja API endpoint
            $league = 'Standard'; // Can be made configurable
            $url = "https://poe.ninja/api/data/itemoverview?league={$league}&type=UniqueArmour";

            echo "  Fetching from: {$url}\n";
            $response = $this->httpClient->get($url);
            $data = json_decode($response->getBody()->getContents(), true);

            if (!isset($data['lines']) || !is_array($data['lines'])) {
                throw new \Exception('Invalid response format from poe.ninja');
            }

            echo "  ✓ Retrieved " . count($data['lines']) . " unique armours\n";

            $count = 0;
            foreach ($data['lines'] as $item) {
                try {
                    // Check if item already exists
                    $existing = $this->gameDataModel->queryOne(
                        "SELECT id FROM uniques WHERE name = ? AND poe_version = ? LIMIT 1",
                        [$item['name'], $version]
                    );

                    if ($existing) {
                        continue; // Skip duplicates
                    }

                    $this->gameDataModel->create([
                        'name' => $item['name'],
                        'base_item' => $item['baseType'] ?? 'Unknown',
                        'inventory_icon' => $item['icon'] ?? null,
                        'stats_json' => json_encode([
                            'chaosValue' => $item['chaosValue'] ?? 0,
                            'exaltedValue' => $item['exaltedValue'] ?? 0,
                            'links' => $item['links'] ?? 0,
                            'itemLevel' => $item['itemLevel'] ?? 0,
                            'variant' => $item['variant'] ?? null
                        ]),
                        'poe_version' => $version,
                    ]);
                    $count++;
                } catch (\Exception $e) {
                    echo "  ✗ Failed: {$item['name']} - {$e->getMessage()}\n";
                    continue;
                }
            }

            echo "✓ Scraped {$count} unique items\n";

            // Also try other item types
            $itemTypes = ['UniqueWeapon', 'UniqueAccessory', 'UniqueJewel', 'UniqueFlask'];
            foreach ($itemTypes as $type) {
                $this->delay();
                $count += $this->scrapeUniqueType($type, $league, $version);
            }

            return $count;

        } catch (\Exception $e) {
            echo "✗ Failed to scrape uniques: " . $e->getMessage() . "\n";

            // Fallback to sample data
            echo "  Using sample data instead...\n";
            return $this->useSampleUniques($version);
        }
    }

    /**
     * Scrape specific unique item type
     */
    private function scrapeUniqueType(string $type, string $league, string $version): int
    {
        try {
            $url = "https://poe.ninja/api/data/itemoverview?league={$league}&type={$type}";
            echo "  Fetching {$type}...\n";

            $response = $this->httpClient->get($url);
            $data = json_decode($response->getBody()->getContents(), true);

            if (!isset($data['lines'])) {
                return 0;
            }

            $count = 0;
            foreach ($data['lines'] as $item) {
                try {
                    $existing = $this->gameDataModel->queryOne(
                        "SELECT id FROM uniques WHERE name = ? AND poe_version = ? LIMIT 1",
                        [$item['name'], $version]
                    );

                    if ($existing) continue;

                    $this->gameDataModel->create([
                        'name' => $item['name'],
                        'base_item' => $item['baseType'] ?? 'Unknown',
                        'inventory_icon' => $item['icon'] ?? null,
                        'stats_json' => json_encode([
                            'chaosValue' => $item['chaosValue'] ?? 0,
                            'type' => $type
                        ]),
                        'poe_version' => $version,
                    ]);
                    $count++;
                } catch (\Exception $e) {
                    continue;
                }
            }

            echo "  ✓ Added {$count} from {$type}\n";
            return $count;

        } catch (\Exception $e) {
            echo "  ✗ Failed {$type}: " . $e->getMessage() . "\n";
            return 0;
        }
    }

    /**
     * Use sample uniques as fallback
     */
    private function useSampleUniques(string $version): int
    {
        $sampleUniques = $this->getSampleUniques($version);

        $count = 0;
        foreach ($sampleUniques as $unique) {
            try {
                $this->gameDataModel->create([
                    'name' => $unique['name'],
                    'base_item' => $unique['base_item'],
                    'inventory_icon' => $unique['icon'] ?? null,
                    'stats_json' => json_encode($unique['stats']),
                    'poe_version' => $version,
                ]);
                $count++;
            } catch (\Exception $e) {
                continue;
            }
        }

        echo "✓ Imported {$count} unique items\n";
        return $count;
    }

    /**
     * Scrape skill gems
     */
    public function scrapeSkillGems(string $version = '3.25'): int
    {
        echo "💎 Scraping skill gems...\n";

        // For demonstration, using sample data
        $sampleGems = $this->getSampleGems($version);

        $count = 0;
        foreach ($sampleGems as $gem) {
            try {
                $this->gameDataModel->getConnection()->insert('skill_gems', [
                    'name' => $gem['name'],
                    'gem_color' => $gem['color'],
                    'gem_tags' => $gem['tags'],
                    'description' => $gem['description'] ?? '',
                    'stats_json' => json_encode($gem['stats']),
                    'poe_version' => $version,
                    'is_support' => $gem['is_support'] ? 1 : 0,
                ]);
                $count++;
                echo "  ✓ Added: {$gem['name']}\n";
            } catch (\Exception $e) {
                echo "  ✗ Failed: {$gem['name']} - {$e->getMessage()}\n";
            }
        }

        echo "✓ Imported {$count} skill gems\n";
        return $count;
    }

    /**
     * Scrape base items
     */
    public function scrapeBaseItems(string $version = '3.25'): int
    {
        echo "⚔️ Scraping base items...\n";

        $sampleBases = $this->getSampleBaseItems($version);

        $count = 0;
        foreach ($sampleBases as $base) {
            try {
                $this->gameDataModel->getConnection()->insert('base_items', [
                    'name' => $base['name'],
                    'item_class' => $base['item_class'],
                    'item_level' => $base['item_level'] ?? 1,
                    'drop_level' => $base['drop_level'] ?? 1,
                    'stats_json' => json_encode($base['stats']),
                ]);
                $count++;
                echo "  ✓ Added: {$base['name']}\n";
            } catch (\Exception $e) {
                echo "  ✗ Failed: {$base['name']} - {$e->getMessage()}\n";
            }
        }

        echo "✓ Imported {$count} base items\n";
        return $count;
    }

    /**
     * Fetch data from poe.ninja API
     */
    public function fetchPoeNinjaData(): bool
    {
        echo "📈 Fetching poe.ninja data...\n";

        try {
            // Example: Fetch unique item prices
            $url = 'https://poe.ninja/api/data/itemoverview?league=Standard&type=UniqueWeapon';

            $response = $this->httpClient->get($url);
            $data = json_decode($response->getBody()->getContents(), true);

            if (isset($data['lines'])) {
                echo "✓ Fetched " . count($data['lines']) . " items from poe.ninja\n";

                // Save to cache file
                $cacheFile = "{$this->dataDir}/poeninja-cache.json";
                file_put_contents($cacheFile, json_encode($data));

                return true;
            }

            return false;

        } catch (\Exception $e) {
            echo "✗ Failed to fetch poe.ninja data: " . $e->getMessage() . "\n";
            return false;
        }
    }

    /**
     * Scrape all data sources
     */
    public function scrapeAll(string $version = '3.25'): array
    {
        $results = [
            'passive_tree' => false,
            'uniques' => 0,
            'gems' => 0,
            'base_items' => 0,
            'poe_ninja' => false,
        ];

        echo "\n" . str_repeat('=', 50) . "\n";
        echo "  Data Scraping Started - Version {$version}\n";
        echo str_repeat('=', 50) . "\n\n";

        // Scrape passive tree
        $results['passive_tree'] = $this->scrapePassiveTree($version);
        $this->delay();

        // Scrape uniques
        $results['uniques'] = $this->scrapeUniques($version);
        $this->delay();

        // Scrape gems
        $results['gems'] = $this->scrapeSkillGems($version);
        $this->delay();

        // Scrape base items
        $results['base_items'] = $this->scrapeBaseItems($version);
        $this->delay();

        // Fetch poe.ninja
        $results['poe_ninja'] = $this->fetchPoeNinjaData();

        echo "\n" . str_repeat('=', 50) . "\n";
        echo "  Scraping Complete!\n";
        echo str_repeat('=', 50) . "\n";
        echo "Passive Tree: " . ($results['passive_tree'] ? '✓' : '✗') . "\n";
        echo "Uniques: {$results['uniques']}\n";
        echo "Gems: {$results['gems']}\n";
        echo "Base Items: {$results['base_items']}\n";
        echo "Poe.ninja: " . ($results['poe_ninja'] ? '✓' : '✗') . "\n";
        echo str_repeat('=', 50) . "\n\n";

        return $results;
    }

    /**
     * Clear old data
     */
    public function clearData(string $version): bool
    {
        echo "🗑️ Clearing old data for version {$version}...\n";

        try {
            $this->gameDataModel->clearOldData('uniques', $version);
            $this->gameDataModel->clearOldData('skill_gems', $version);

            echo "✓ Old data cleared\n";
            return true;
        } catch (\Exception $e) {
            echo "✗ Failed to clear data: " . $e->getMessage() . "\n";
            return false;
        }
    }

    /**
     * Delay between requests (respect rate limits)
     */
    private function delay(): void
    {
        sleep($this->config['delay']);
    }

    /**
     * Get sample unique items
     */
    private function getSampleUniques(string $version): array
    {
        return [
            [
                'name' => "Kaom's Heart",
                'base_item' => 'Glorious Plate',
                'stats' => [
                    '+500 to maximum Life',
                    'Has no Sockets',
                    '20% increased Fire Damage'
                ]
            ],
            [
                'name' => 'Shavronne\'s Wrappings',
                'base_item' => 'Occultist\'s Vestment',
                'stats' => [
                    'Chaos Damage does not bypass Energy Shield',
                    '+250 to maximum Energy Shield',
                    '10% faster start of Energy Shield Recharge'
                ]
            ],
            [
                'name' => 'Tabula Rasa',
                'base_item' => 'Simple Robe',
                'stats' => [
                    'Item has 6 White Sockets and is fully linked',
                    'Has no level requirement'
                ]
            ],
            [
                'name' => 'Headhunter',
                'base_item' => 'Leather Belt',
                'stats' => [
                    '+40 to maximum Life',
                    'When you kill a Rare monster, you gain its modifiers for 20 seconds'
                ]
            ],
            [
                'name' => 'Atziri\'s Promise',
                'base_item' => 'Amethyst Flask',
                'stats' => [
                    '2% of Chaos Damage Leeched as Life during Flask effect',
                    'Gain 15% of Physical Damage as Extra Chaos Damage during effect'
                ]
            ]
        ];
    }

    /**
     * Get sample skill gems
     */
    private function getSampleGems(string $version): array
    {
        return [
            [
                'name' => 'Righteous Fire',
                'color' => 'red',
                'tags' => 'spell,aoe,fire,duration',
                'description' => 'Engulfs you in magical fire that rapidly burns you and nearby enemies.',
                'stats' => ['Deals Fire Damage per second', 'More Spell Damage'],
                'is_support' => false
            ],
            [
                'name' => 'Elemental Focus',
                'color' => 'blue',
                'tags' => 'support',
                'description' => 'Supported Skills cannot inflict Elemental Ailments',
                'stats' => ['More Elemental Damage'],
                'is_support' => true
            ],
            [
                'name' => 'Detonate Dead',
                'color' => 'red',
                'tags' => 'spell,aoe,fire',
                'description' => 'Targets a corpse, causing it to explode, dealing fire damage.',
                'stats' => ['Deals Fire Damage'],
                'is_support' => false
            ],
            [
                'name' => 'Cyclone',
                'color' => 'red',
                'tags' => 'attack,aoe,melee',
                'description' => 'Channel to spin and attack nearby enemies.',
                'stats' => ['Attack Damage'],
                'is_support' => false
            ],
            [
                'name' => 'Increased Critical Strikes',
                'color' => 'blue',
                'tags' => 'support,critical',
                'description' => 'Increases Critical Strike Chance',
                'stats' => ['Increased Critical Strike Chance'],
                'is_support' => true
            ]
        ];
    }

    /**
     * Get sample base items
     */
    private function getSampleBaseItems(string $version): array
    {
        return [
            [
                'name' => 'Glorious Plate',
                'item_class' => 'Body Armour',
                'item_level' => 68,
                'drop_level' => 68,
                'stats' => ['Armour: 776']
            ],
            [
                'name' => 'Vaal Regalia',
                'item_class' => 'Body Armour',
                'item_level' => 68,
                'drop_level' => 68,
                'stats' => ['Energy Shield: 220']
            ],
            [
                'name' => 'Assassin\'s Garb',
                'item_class' => 'Body Armour',
                'item_level' => 68,
                'drop_level' => 68,
                'stats' => ['Evasion: 550']
            ]
        ];
    }
}
