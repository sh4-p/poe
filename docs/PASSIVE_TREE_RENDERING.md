# Passive Tree Rendering - Detaylı Teknik Döküman

## 🎨 Görsel Kalite İyileştirmeleri

Passive tree artık **tam Path of Exile görünümünde** ve **çok daha detaylı** render ediliyor.

### Problem ve Çözüm

**Önceki Sorunlar:**
1. ❌ Sprite'lar doğru crop edilmiyordu (SVG clipPath problemi)
2. ❌ Tüm node'lar aynı/küçük gözüküyordu
3. ❌ Detay eksikti

**Çözümler:**
1. ✅ Canvas-based sprite extraction (pixel-perfect)
2. ✅ 2.5x base multiplier (büyük sprite'lar)
3. ✅ Yüksek kalite asset'ler (zoom level 2)

## 🖼️ Sprite Rendering Sistemi

### Canvas-Based Extraction

```javascript
async cropSpriteFromSheet(spriteImage, coords) {
    // Off-screen canvas oluştur
    const canvas = document.createElement('canvas');
    canvas.width = coords.w;
    canvas.height = coords.h;
    const ctx = canvas.getContext('2d');

    // Sprite sheet'ten ilgili bölgeyi crop et
    ctx.drawImage(
        spriteImage,
        coords.x, coords.y, coords.w, coords.h,  // Source (sheet'teki konum)
        0, 0, coords.w, coords.h                   // Destination (canvas'ta konum)
    );

    // PNG data URL olarak export et
    return canvas.toDataURL('image/png');
}
```

**Avantajları:**
- Pixel-perfect cropping
- No SVG transform issues
- Data URL caching
- CORS-safe

### Sprite Boyutları

| Node Type | Multiplier | Final Size | Görünüm |
|-----------|-----------|-----------|---------|
| Root | 8.75x | **Çok Büyük** | Merkez node |
| Class Start | 7.5x | Büyük | Başlangıç |
| Keystone | 7.0x | Büyük | Mor diamond |
| Mastery | 6.25x | Orta-Büyük | Mastery icon |
| Notable | 5.5x | Orta | Yeşil circle |
| Jewel | 5.0x | Orta | Jewel socket |
| Normal | 3.75x | Küçük | Normal node |

**Base Multiplier:** 2.5x (tüm node'ları büyütür)

### Asset Quality

**4 Zoom Seviyesi:**
```javascript
imageZoomLevels: [
    0.1246,  // Level 0 - Low (312x459)
    0.2109,  // Level 1 - Medium (520x775)
    0.2972,  // Level 2 - HIGH ✅ (728x1087)
    0.3835   // Level 3 - Max (936x1399)
]
```

**Varsayılan:** Level 2 (HIGH quality)

## 🔗 Connection Rendering

### 3 Farklı State

1. **Fully Allocated** (her iki node allocated)
   ```javascript
   Color: #b89968 (altın)
   Width: 4px
   Opacity: 0.9
   ```

2. **Partially Allocated** (bir node allocated)
   ```javascript
   Color: #7a6f5c (dim gold)
   Width: 3px
   Opacity: 0.6
   ```

3. **Unallocated**
   ```javascript
   Color: #4a4a4a (dark gray)
   Width: 2px
   Opacity: 0.3
   ```

### Line Sprite Support

```javascript
// GGG line-{0-3}.png kullanımı
if (lineSprite && isAllocated) {
    // Rotated line sprite
    connectionLayer.append('image')
        .attr('xlink:href', lineUrl)
        .attr('width', length)
        .attr('height', 4)
        .style('transform', `rotate(${angle}deg)`);
} else {
    // SVG line fallback
    connectionLayer.append('line')
        .attr('stroke', strokeColor)
        .attr('stroke-width', strokeWidth);
}
```

## 🖼️ Frame Overlay

Her node'un üstüne frame sprite eklenir:

```javascript
// frame-{0-3}.png
const frameUrl = `${assetBaseUrl}frame-${spriteZoomLevel}.png`;
const frameSize = Math.max(w, h) * 1.2; // Sprite'tan 1.2x daha büyük

g.append('image')
    .attr('xlink:href', frameUrl)
    .attr('width', frameSize)
    .attr('height', frameSize)
    .style('opacity', isAllocated ? 0.8 : 0.5);
```

## 🔍 Level of Detail (LOD)

Zoom seviyesine göre dinamik node görünürlüğü:

### Zoom Thresholds

| Zoom Level | Görünen Node'lar | Performans |
|-----------|------------------|-----------|
| < 0.3 | Keystone + Root | ⚡ En hızlı |
| 0.3 - 0.6 | + Notables | ⚡ Hızlı |
| > 0.6 | Tüm önemli node'lar | 🎨 Full detail |

### Implementation

```javascript
updateLOD(zoomScale) {
    if (zoomScale < 0.3) {
        // Sadece keystones
        nodeLayer.selectAll('.tree-node')
            .style('display', d =>
                d.type === 'keystone' ? 'block' : 'none'
            );
    } else if (zoomScale < 0.6) {
        // Keystones + Notables
        // ...
    } else {
        // Hepsi
        nodeLayer.selectAll('.tree-node')
            .style('display', 'block');
    }
}
```

**Trigger:** 0.5+ zoom değişiminde

## 🎯 Visual Polish

### Text Labels

```javascript
text
    .attr('font-size', '12px')           // Büyük font
    .attr('y', node.y + radius + 20)     // Daha uzak
    .attr('fill', isAllocated ? '#d4af37' : '#999')
    .style('text-shadow', '0 0 4px rgba(0,0,0,0.8)') // Okunabilirlik
```

### Node Glow

```javascript
// SVG filter - sadece allocated node'lar için
<filter id="node-glow">
    <feGaussianBlur stdDeviation="3" />
    <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
    </feMerge>
</filter>

// Kullanım
g.style('filter', 'url(#node-glow)');
```

## 📊 Rendering Pipeline

### Adım Adım İşlem

```
1. renderTree() çağrıl
   ├─ renderBackground()
   │  └─ background-2.png (HIGH quality)
   │
   ├─ renderGroupBackgrounds()
   │  └─ group-background-2.png (orbit groups)
   │
   ├─ renderConnections()
   │  ├─ Try line-2.png sprite
   │  └─ Fallback: SVG lines (3 states)
   │
   └─ renderNodes()
      ├─ Filter: important nodes only
      ├─ For each node:
      │  ├─ getSpriteForNode() → sprite data
      │  ├─ loadSpriteImage() → cache/load
      │  ├─ cropSpriteFromSheet() → Canvas crop
      │  ├─ Render sprite (2.5x scaled)
      │  └─ Add frame overlay
      └─ Render normal nodes (small dots)
```

### Performance Optimizations

1. **Sprite Caching**
   ```javascript
   spriteImages: Map<url, Image>
   // Bir kez yükle, sonsuza kadar kullan
   ```

2. **Canvas Data URL Caching**
   ```javascript
   // Her crop sonucu cache'lenir
   // Aynı sprite tekrar crop edilmez
   ```

3. **LOD System**
   ```javascript
   // Zoom out → Daha az node
   // Zoom in → Daha fazla detail
   ```

4. **Layer-Based Rendering**
   ```javascript
   // Her layer ayrı clear edilebilir
   // Selective re-rendering
   ```

## 🛠️ Configuration

### Options

```javascript
const viewer = new PassiveTreeViewer(container, {
    // Zoom
    minZoom: 0.1,
    maxZoom: 5,              // Artırıldı (3 → 5)

    // Sprites
    useSprites: true,
    spriteZoomLevel: 2,      // HIGH quality
    assetBaseUrl: 'https://raw.githubusercontent.com/grindinggear/skilltree-export/3.27.0/assets/',

    // LOD
    enableLOD: true,         // Zoom-based visibility
});
```

### Asset URLs

```javascript
// Pattern
`${assetBaseUrl}{type}-{zoomLevel}.{ext}`

// Examples
background-2.png
group-background-2.png
skills-2.jpg           // Main sprite sheet
mastery-2.png
jewel-2.png
frame-2.png
line-2.png
```

## 🎮 Sonuç

### Öncesi vs Sonrası

**Öncesi:**
- ❌ Küçük sprite'lar (1-1.2x)
- ❌ Hatalı cropping (SVG clipPath)
- ❌ Medium quality (level 1)
- ❌ Tek renk connections
- ❌ Frame yok

**Sonrası:**
- ✅ Büyük sprite'lar (3.75-8.75x)
- ✅ Pixel-perfect cropping (Canvas)
- ✅ HIGH quality (level 2)
- ✅ 3 state connections
- ✅ Frame overlay
- ✅ Zoom-based LOD
- ✅ Max zoom 5x

### Visual Comparison

```
Keystone Size:
Öncesi: 14px * 1.2 = 16.8px
Sonrası: 14px * 7.0 = 98px

Sprite Quality:
Öncesi: 520x775 (medium)
Sonrası: 728x1087 (HIGH)

Detail Level:
Öncesi: ⭐⭐
Sonrası: ⭐⭐⭐⭐⭐
```

## 🧪 Test

```bash
# 1. Kodu çek
git pull

# 2. Tree data güncelle
php cli/scraper.php --task=tree

# 3. Browser'da test et
# Console'da göreceksin:
# "🎨 Rendering passive tree with GGG official assets..."
# "✓ Background rendered"
# "✓ Group backgrounds rendered"
# "✓ Rendered X connections"
# "✓ All nodes rendered"
# "✅ Tree rendering complete"

# 4. Zoom in/out yap
# LOD updates göreceksin:
# "LOD updated for zoom: 0.45"
```

## 📚 Referanslar

- **GGG Official**: https://github.com/grindinggear/skilltree-export
- **Path of Building**: https://github.com/PathOfBuildingCommunity/PathOfBuilding
- **POE CDN**: https://web.poecdn.com/image/passive-skill/

---

**Artık tam Path of Exile görünümü! 🎮✨**
