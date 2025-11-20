<?php

declare(strict_types=1);

namespace App\Services;

use GuzzleHttp\Client;

/**
 * Gemini AI Service
 * Handles communication with Google Gemini API for AI build generation
 */
class GeminiAIService
{
    private string $apiKey;
    private string $endpoint;
    private Client $httpClient;
    private array $config;

    public function __construct()
    {
        $servicesConfig = require __DIR__ . '/../../config/services.php';
        $this->config = $servicesConfig['gemini'];

        $this->apiKey = $this->config['api_key'];
        $this->endpoint = $this->config['endpoint'];
        $this->httpClient = new Client([
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json',
            ]
        ]);
    }

    /**
     * Generate build using AI
     */
    public function generateBuild(string $userPrompt, array $context): ?array
    {
        // Build comprehensive prompt
        $fullPrompt = $this->buildPrompt($userPrompt, $context);

        // Call Gemini API
        try {
            $response = $this->callGeminiAPI($fullPrompt);

            if (!$response) {
                return null;
            }

            // Parse response
            $buildData = $this->parseResponse($response);

            // Validate build data
            if (!$this->validateBuildData($buildData)) {
                error_log('AI generated invalid build data');
                return null;
            }

            return $buildData;

        } catch (\Exception $e) {
            error_log('Gemini API Error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Build comprehensive prompt for Gemini
     */
    public function buildPrompt(string $userRequest, array $context): string
    {
        $prompt = <<<PROMPT
You are an expert Path of Exile build creator with deep knowledge of game mechanics, item interactions, and current meta.

CONTEXT:
- Game Version: 3.25
- League: Current League
- User Request: {$userRequest}

PARAMETERS:
PROMPT;

        if (!empty($context['ascendancy'])) {
            $prompt .= "\n- Ascendancy: {$context['ascendancy']}";
        }

        if (!empty($context['main_skill'])) {
            $prompt .= "\n- Main Skill: {$context['main_skill']}";
        }

        if (!empty($context['budget'])) {
            $prompt .= "\n- Budget: {$context['budget']}";
        }

        if (!empty($context['content_focus'])) {
            $prompt .= "\n- Content Focus: {$context['content_focus']}";
        }

        if (!empty($context['available_uniques'])) {
            $uniqueList = implode(', ', array_slice($context['available_uniques'], 0, 20));
            $prompt .= "\n\nAVAILABLE UNIQUE ITEMS (examples):\n{$uniqueList}";
        }

        if (!empty($context['available_gems'])) {
            $gemList = implode(', ', $context['available_gems']);
            $prompt .= "\n\nAVAILABLE SKILL GEMS:\n{$gemList}";
        }

        $prompt .= <<<PROMPT


INSTRUCTIONS:
1. Create a viable Path of Exile build based on the user's request
2. Choose appropriate items, skill gems, and passive tree allocation
3. Provide reasoning for your choices
4. Return your response ONLY as valid JSON matching this schema (no markdown, no explanation outside JSON):

{
  "build_name": "string",
  "ascendancy_class": "string",
  "main_skill": "string",
  "items": [
    {
      "slot": "string",
      "name": "string",
      "rarity": "unique|rare|magic",
      "required_stats": ["string"]
    }
  ],
  "skill_gems": [
    {
      "link_group": "string",
      "gems": ["string"],
      "socket_colors": "string"
    }
  ],
  "flasks": ["string"],
  "jewels": [
    {
      "type": "string",
      "priority_stats": ["string"]
    }
  ],
  "playstyle": "string",
  "strengths": ["string"],
  "weaknesses": ["string"]
}

Respond ONLY with the JSON object, nothing else.
PROMPT;

        return $prompt;
    }

    /**
     * Call Gemini API
     */
    private function callGeminiAPI(string $prompt): ?string
    {
        if (empty($this->apiKey) || $this->apiKey === 'your_api_key_here') {
            // Return mock response for development
            return $this->getMockResponse();
        }

        try {
            $url = $this->endpoint . '?key=' . $this->apiKey;

            $response = $this->httpClient->post($url, [
                'json' => [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => $this->config['temperature'],
                        'maxOutputTokens' => $this->config['max_tokens'],
                    ]
                ]
            ]);

            $body = json_decode($response->getBody()->getContents(), true);

            // Extract text from Gemini response
            if (isset($body['candidates'][0]['content']['parts'][0]['text'])) {
                return $body['candidates'][0]['content']['parts'][0]['text'];
            }

            return null;

        } catch (\Exception $e) {
            error_log('Gemini API call failed: ' . $e->getMessage());
            // Fallback to mock for development
            return $this->getMockResponse();
        }
    }

    /**
     * Parse AI response to structured data
     */
    public function parseResponse(string $response): ?array
    {
        // Clean up response (remove markdown code blocks if present)
        $response = preg_replace('/```json\s*/', '', $response);
        $response = preg_replace('/```\s*$/', '', $response);
        $response = trim($response);

        // Decode JSON
        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('JSON parse error: ' . json_last_error_msg());
            return null;
        }

        return $data;
    }

    /**
     * Validate build data structure
     */
    public function validateBuildData(array $data): bool
    {
        // Check required fields
        $required = ['build_name', 'ascendancy_class', 'main_skill'];

        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Mock response for development/testing
     */
    private function getMockResponse(): string
    {
        return json_encode([
            'build_name' => 'Righteous Fire Juggernaut',
            'ascendancy_class' => 'Juggernaut',
            'main_skill' => 'Righteous Fire',
            'items' => [
                [
                    'slot' => 'Helmet',
                    'name' => 'Rare Helmet',
                    'rarity' => 'rare',
                    'required_stats' => ['+80 to maximum Life', '+40% to Fire Resistance']
                ],
                [
                    'slot' => 'Body Armour',
                    'name' => "Kaom's Heart",
                    'rarity' => 'unique',
                    'required_stats' => []
                ],
                [
                    'slot' => 'Boots',
                    'name' => 'Rare Boots',
                    'rarity' => 'rare',
                    'required_stats' => ['+80 to maximum Life', '30% increased Movement Speed']
                ],
                [
                    'slot' => 'Gloves',
                    'name' => 'Rare Gloves',
                    'rarity' => 'rare',
                    'required_stats' => ['+80 to maximum Life', '+40% to Fire Resistance']
                ],
                [
                    'slot' => 'Shield',
                    'name' => 'Rise of the Phoenix',
                    'rarity' => 'unique',
                    'required_stats' => []
                ]
            ],
            'skill_gems' => [
                [
                    'link_group' => '4-Link Shield',
                    'gems' => ['Righteous Fire', 'Elemental Focus', 'Burning Damage', 'Concentrated Effect'],
                    'socket_colors' => 'RRRR'
                ]
            ],
            'flasks' => ['Divine Life Flask', 'Ruby Flask', 'Granite Flask'],
            'jewels' => [
                [
                    'type' => 'Rare Jewel',
                    'priority_stats' => ['% increased maximum Life', '% increased Fire Damage']
                ]
            ],
            'playstyle' => 'Tank build that walks through enemies burning them with Righteous Fire aura',
            'strengths' => ['Very tanky', 'Great life regeneration', 'Good clear speed'],
            'weaknesses' => ['Limited single target', 'Requires specific uniques', 'Cannot do reflect maps']
        ]);
    }
}
