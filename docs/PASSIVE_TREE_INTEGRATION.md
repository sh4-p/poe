# Passive Tree Integration with Official GGG Data

## Overview

Exile Architect now integrates directly with **Grinding Gear Games' official passive skill tree data** from their `skilltree-export` repository. This ensures the most accurate and up-to-date passive tree visualization.

## Data Sources

### Primary Source: GGG Official Repository
- **Repository**: https://github.com/grindinggear/skilltree-export
- **Format**: JSON export of the complete passive skill tree
- **Files Available**:
  - `data.json` - Standard passive skill tree
  - `alternate.json` - Alternate tree variant
  - `ruthless.json` - Ruthless mode version
  - `ruthless-alternate.json` - Ruthless alternate

### Fallback Sources
1. **Path of Building Community**: Community-maintained tree data
2. **POE Tool Dev**: Alternative passive tree repository

## Data Structure

### Root Level Properties

```json
{
  "tree": "Default",
  "classes": [...],
  "alternate_ascendancies": [...],
  "groups": {...},
  "nodes": {...},
  "constants": {...},
  "jewelSlots": [...],
  "sprites": {...}
}
```

### Node Structure

Each node in the `nodes` object has:

```json
"52349": {
  "skill": 52349,                    // Unique node ID
  "name": "The King's Contempt",    // Display name
  "icon": "Art/2DArt/...",          // Icon path
  "stats": [                         // Stat modifiers
    "Discipline has 50% increased Aura Effect..."
  ],
  "group": 1,                        // Group ID for positioning
  "orbit": 0,                        // Orbit level (0-6)
  "orbitIndex": 0,                   // Position in orbit
  "out": ["10696"],                  // Outgoing connections
  "in": [],                          // Incoming connections

  // Optional flags
  "isNotable": true,                 // Notable passive
  "isKeystone": true,                // Keystone
  "isMastery": true,                 // Mastery node
  "isJewelSocket": true,             // Jewel socket
  "isBloodline": true,               // Bloodline node
  "ascendancyName": "Aul",          // Ascendancy association

  // Mastery-specific (if isMastery)
  "masteryEffects": [...],
  "inactiveIcon": "...",
  "activeIcon": "...",

  // Jewel-specific (if isJewelSocket)
  "expansionJewel": {...}
}
```

### Group Structure

Groups define spatial clusters and base positions:

```json
"1": {
  "x": -13902.9,      // X coordinate
  "y": 6603.92,       // Y coordinate
  "orbits": [0],      // Which orbits exist in this group
  "nodes": ["52349"], // Node IDs in this group
  "background": {     // Optional background (v3.20.0+)
    "image": "PSGroupBackground3",
    "isHalfImage": true
  }
}
```

### Constants

Critical for positioning calculations:

```json
"constants": {
  "orbitRadii": [0, 82, 162, 335, 493, 662, 846],  // Radius of each orbit
  "skillsPerOrbit": [1, 6, 16, 16, 40, 72, 72],    // Nodes per orbit
  "PSSCentreInnerRadius": 130
}
```

## Position Calculation

Nodes are positioned using a **group + orbit system**:

1. **Base Position**: From group's `x` and `y`
2. **Orbit Offset**: Calculated using:
   ```javascript
   const orbitRadius = constants.orbitRadii[node.orbit];
   const skillsInOrbit = constants.skillsPerOrbit[node.orbit];
   const angle = (2 * Math.PI * node.orbitIndex) / skillsInOrbit;

   x = group.x + orbitRadius * Math.sin(angle);
   y = group.y - orbitRadius * Math.cos(angle);  // Negative Y (screen coords)
   ```

## Node Types

### Detected Node Types

| Type | Detection | Visual Style |
|------|-----------|--------------|
| **Root** | `orbit === 0 && group === 0` | White, 16px radius |
| **Class Start** | `classStartIndex !== undefined` | Blue, 12px radius |
| **Keystone** | `isKeystone === true` | Purple, 14px radius |
| **Mastery** | `isMastery === true` | Deep purple, 12px radius |
| **Jewel Socket** | `isJewelSocket === true` | Teal, 12px radius |
| **Notable** | `isNotable === true` | Green, 10px radius |
| **Ascendancy** | `ascendancyName` present | Red, 10px radius |
| **Bloodline** | `isBloodline === true` | Orange, 10px radius |
| **Normal** | None of the above | Gray, 8px radius |

## Implementation

### Backend (DataScraperService.php)

```php
public function scrapePassiveTree(string $version = 'latest'): bool
{
    $sources = [
        [
            'url' => 'https://raw.githubusercontent.com/grindinggear/skilltree-export/master/data.json',
            'name' => 'GGG Official Skill Tree Export'
        ],
        // ... fallback sources
    ];

    // Try each source until one succeeds
    // Save to file and database
}
```

### API Endpoint (ApiController.php)

```php
// GET /api/passive-tree?version=latest
public function passiveTree(): Response
{
    // 1. Try database first
    $treeData = $this->gameDataModel->getPassiveTreeFromDB($version);

    // 2. Fallback to file
    if (!$treeData) {
        $treeData = $this->gameDataModel->getPassiveTreeData($version);
    }

    // 3. Return with metadata
    return $this->json([
        'success' => true,
        'version' => $version,
        'tree' => $treeData,
        'nodeCount' => count($treeData['nodes'] ?? [])
    ]);
}
```

### Frontend (PassiveTreeViewer.js)

```javascript
// 1. Load tree from API
async loadTree(version = 'latest') {
    const response = await fetch('/api/passive-tree?version=' + version);
    const apiData = await response.json();

    // 2. Transform official format
    this.treeData = this.transformOfficialTreeData(apiData.tree);

    // 3. Render with D3.js
    this.renderTree();
}

// 4. Transform GGG format to viewer format
transformOfficialTreeData(officialData) {
    // Calculate positions using groups + orbits
    // Parse node properties and connections
    // Return normalized format for D3.js
}
```

## Version History Changes

### Version 3.20.0 (Latest)
- **Background Property**: Group backgrounds now embedded in group objects
- Removed deprecated `backgroundOverride` property

### Version 3.18.1
- **Spritesheets**: All image assets use spritesheets
- Supplied with each data release

### Version 3.17.0
- **Orbit Redesign**: Orbits 2 and 3 expanded from 12 to 16 nodes
- Angular positions adjusted accordingly

## Usage

### Manual Data Refresh

```bash
# Fetch latest passive tree data from GGG
php cli/scraper.php --task=tree

# View scraper output
tail -f logs/scraper.log
```

### Database Storage

```sql
SELECT poe_version, node_count, created_at
FROM passive_tree
ORDER BY created_at DESC;
```

### Frontend Integration

```html
<!-- In build editor/viewer -->
<div id="passive-tree-container"></div>

<script type="module">
import { PassiveTreeViewer } from '/assets/js/modules/PassiveTreeViewer.js';

const viewer = new PassiveTreeViewer(
    document.getElementById('passive-tree-container')
);

// Viewer automatically loads from /api/passive-tree
// Falls back to sample data if API unavailable
</script>
```

## Benefits of Official Integration

1. **Accuracy**: Always matches the actual game
2. **Complete Data**: All 3000+ nodes with full properties
3. **Version Support**: Easy to support multiple POE versions
4. **Maintainability**: GGG maintains the data, we just consume it
5. **Future-Proof**: Automatic support for new content updates

## Related Documentation

- [Official POE Developer Docs](https://www.pathofexile.com/developer/docs)
- [GGG Skilltree Export](https://github.com/grindinggear/skilltree-export)
- [Atlas Tree Export](https://github.com/grindinggear/atlastree-export) (separate)

## Troubleshooting

### Tree Not Loading

1. Check if data file exists: `ls -lh data/passive-tree/`
2. Run scraper: `php cli/scraper.php --task=tree`
3. Check database: `SELECT * FROM passive_tree;`
4. Check browser console for transformation errors

### Position Issues

- Verify `constants` are present in tree data
- Check `groups` object exists
- Ensure node has valid `group`, `orbit`, `orbitIndex`

### Missing Nodes

- Full tree has 3000+ nodes
- Some nodes may be hidden (ascendancy-specific)
- Check `isAscendancyStart` and `ascendancyName` filters
