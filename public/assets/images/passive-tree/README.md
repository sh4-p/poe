# Path of Exile Passive Tree Assets

This directory contains official Path of Exile passive skill tree assets from GGG's skilltree-export repository.

## Source
**GitHub Repository**: https://github.com/grindinggear/skilltree-export
**Version**: 3.27.0 (Path of Exile: Keepers of the Flame)
**Commit**: 326858d

## Asset Categories

### Backgrounds (4 zoom levels: 0-3)
- `background-{0-3}.png` - Main tree background images
- `ascendancy-background-{0-3}.jpg` - Ascendancy area backgrounds (JPEG)
- `ascendancy-background-{0-3}.png` - Ascendancy area backgrounds (PNG)

### Group Backgrounds (4 zoom levels)
- `group-background-{0-3}.png` - Node cluster group backgrounds

### Node Sprites

#### Skills (Node icons)
- `skills-{0-3}.jpg` - Active node sprite sheets (4 zoom levels)
- `skills-disabled-{0-3}.jpg` - Inactive node sprite sheets

#### Ascendancy
- `ascendancy-{0-3}.png` - Ascendancy node PNG sprites
- `ascendancy-{0-3}.webp` - Ascendancy node WebP sprites (optimized)

#### Bloodline
- `bloodline-{0-3}.webp` - Bloodline node sprites (4 zoom levels)

#### Mastery (5 states × 4 zoom levels)
- `mastery-{0-3}.png` - Basic mastery node sprites
- `mastery-active-effect-{0-3}.png` - Active mastery with effect
- `mastery-active-selected-{0-3}.png` - Selected mastery state
- `mastery-connected-{0-3}.png` - Connected mastery state
- `mastery-disabled-{0-3}.png` - Disabled mastery state

#### Tattoo
- `tattoo-active-effect-{0-3}.png` - Tattoo effect sprites

### Frames & Decorations
- `frame-{0-3}.png` - Node frame overlays (4 zoom levels)
- `line-{0-3}.png` - Connection line sprites (4 zoom levels)

### Jewels
- `jewel-{0-3}.png` - Jewel socket sprites (4 zoom levels)
- `jewel-radius.png` - Jewel radius indicator overlay

## Zoom Levels (POE Official)
GGG uses 4 zoom levels with corresponding zoom factors:

| Level | Zoom Factor | Description |
|-------|-------------|-------------|
| 0 | 0.1246 | Lowest zoom - smallest sprites |
| 1 | 0.2109 | Low zoom |
| 2 | 0.2972 | Default zoom - balanced |
| 3 | 0.3835 | Highest zoom - largest sprites |

## Total Assets
- **Files**: 73
- **Total Size**: ~38 MB
- **Added Ascendancy Backgrounds**: +16 files (vs POE CDN)

## Companion Data Files
Located in `/public/data/`:
- `passive-tree-3.27.0.json` - Main passive tree data (5.4 MB)
- `passive-tree-3.27.0-alternate.json` - Alternate ascendancies
- `passive-tree-3.27.0-ruthless.json` - Ruthless league variant
- `passive-tree-3.27.0-ruthless-alternate.json` - Ruthless + alternate

## Usage in Code
```javascript
// Assets
const assetBaseUrl = '/assets/images/passive-tree/';
const zoomLevel = 2; // 0-3
const backgroundUrl = `${assetBaseUrl}background-${zoomLevel}.png`;
const ascBgUrl = `${assetBaseUrl}ascendancy-background-${zoomLevel}.jpg`;

// Data
const treeData = await fetch('/data/passive-tree-3.27.0.json').then(r => r.json());
```

## Differences from POE CDN
This repository's assets include:
- ✅ Ascendancy background images (not on CDN)
- ✅ PNG versions of ascendancy nodes (CDN has WebP)
- ✅ Local data.json (no API calls needed)

## File Format Support
- **PNG**: Frame overlays, backgrounds, mastery sprites, jewels
- **JPG**: Skill sprites, ascendancy backgrounds (smaller files)
- **WebP**: Ascendancy and bloodline nodes (better compression)

## License
These assets are property of Grinding Gear Games (Path of Exile).
Downloaded from official GitHub repository: grindinggear/skilltree-export
Used for educational/non-commercial purposes.

## Version History
- **3.27.0** (November 2024) - Keepers of the Flame
  - Initial integration with Exile Architect
  - Full asset collection from official GGG repository
  - 73 files, 38 MB total

Last Updated: November 21, 2024
POE Version: 3.27.0
Repository: https://github.com/grindinggear/skilltree-export
