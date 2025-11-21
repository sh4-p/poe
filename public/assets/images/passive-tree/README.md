# Path of Exile Passive Tree Assets

This directory contains official Path of Exile passive skill tree assets downloaded from POE CDN.

## Source
All assets are from: `https://web.poecdn.com/image/passive-skill/`

## Asset Categories

### Backgrounds (4 zoom levels: 0-3)
- `background-{0-3}.png` - Tree background images

### Group Backgrounds (4 zoom levels)
- `group-background-{0-3}.png` - Cluster group backgrounds

### Node Sprites

#### Skills (Node icons)
- `skills-{0-3}.jpg` - Active node sprite sheets (4 zoom levels)
- `skills-disabled-{0-3}.jpg` - Inactive node sprite sheets

#### Ascendancy
- `ascendancy-{0-3}.webp` - Ascendancy node sprites (4 zoom levels)

#### Bloodline
- `bloodline-{0-3}.webp` - Bloodline node sprites (4 zoom levels)

#### Mastery
- `mastery-{0-3}.png` - Basic mastery sprites
- `mastery-active-effect-{0-3}.png` - Active mastery effect
- `mastery-active-selected-{0-3}.png` - Selected mastery
- `mastery-connected-{0-3}.png` - Connected mastery
- `mastery-disabled-{0-3}.png` - Disabled mastery

#### Tattoo
- `tattoo-active-effect-{0-3}.png` - Tattoo effect sprites

### Frames & Decorations
- `frame-{0-3}.png` - Node frame overlays (4 zoom levels)
- `line-{0-3}.png` - Connection line sprites (4 zoom levels)

### Jewels
- `jewel-{0-3}.png` - Jewel socket sprites (4 zoom levels)
- `jewel-radius.png` - Jewel radius indicator

## Zoom Levels (POE Official)
- **Level 0**: 0.1246 (Lowest zoom - smallest sprites)
- **Level 1**: 0.2109
- **Level 2**: 0.2972 (Default - good balance)
- **Level 3**: 0.3835 (Highest zoom - largest sprites)

## Total Assets
- **Files**: 61
- **Total Size**: ~22 MB

## Usage in Code
```javascript
const assetBaseUrl = '/assets/images/passive-tree/';
const zoomLevel = 2; // 0-3
const backgroundUrl = `${assetBaseUrl}background-${zoomLevel}.png`;
const skillsUrl = `${assetBaseUrl}skills-${zoomLevel}.jpg`;
```

## License
These assets are property of Grinding Gear Games (Path of Exile).
Used for educational/non-commercial purposes.

Last Updated: November 2024
POE Version: 3.27.0d
