# Build Guide - Exile Architect

This document describes how to build and optimize the application for production.

## Prerequisites

- Node.js 16+ (for build tools)
- PHP 8.2+
- Composer

## Development Build

For development, use CDN versions (already configured):

```bash
# Just start the development server
composer serve
```

The application uses:
- Tailwind CSS via CDN (in development)
- Native ES6 modules (no bundling needed)
- D3.js loaded dynamically

## Production Build

For production deployment, compile and minify assets:

### 1. Install Build Dependencies

```bash
npm install
```

This installs:
- Tailwind CSS compiler
- Terser (JS minifier)

### 2. Build CSS

Compile and minify Tailwind CSS:

```bash
npm run build:css
```

Output: `public/assets/css/style.min.css`

During development, watch for changes:

```bash
npm run watch:css
```

### 3. Build JavaScript

Minify JavaScript modules:

```bash
npm run build:js
```

Output: `public/assets/js/dist/*.min.js`

### 4. Full Production Build

Build everything at once:

```bash
npm run production
```

This will:
1. Compile Tailwind CSS with optimizations
2. Minify all JavaScript modules
3. Remove unused CSS classes
4. Optimize for smallest bundle size

## Production Configuration

### 1. Update Layout Template

Edit `app/Views/layouts/main.twig`:

```twig
{# Development - CDN #}
<!-- <script src="https://cdn.tailwindcss.com"></script> -->

{# Production - Compiled CSS #}
<link rel="stylesheet" href="/assets/css/style.min.css">
```

### 2. Update JavaScript Imports

For production, update import paths in `main.js`:

```javascript
// Development
import { BuildManager } from './modules/BuildManager.js';

// Production
import { BuildManager } from './dist/modules/BuildManager.min.js';
```

Or use a production flag:

```javascript
const isDev = window.location.hostname === 'localhost';
const basePath = isDev ? './modules/' : './dist/modules/';

const { BuildManager } = await import(`${basePath}BuildManager${isDev ? '' : '.min'}.js`);
```

### 3. Environment Configuration

Set production environment variables in `.env`:

```bash
APP_ENV=production
APP_DEBUG=false
```

## Build Optimization Results

Expected file size reductions:

### CSS
- **Development (CDN):** ~3.5 MB (full Tailwind)
- **Production (compiled):** ~50-100 KB (only used classes)
- **Savings:** ~97-98%

### JavaScript
- **api.js:** 5.2 KB → 2.1 KB (60% smaller)
- **utils.js:** 3.8 KB → 1.5 KB (61% smaller)
- **BuildManager.js:** 12.4 KB → 5.2 KB (58% smaller)
- **ItemSelector.js:** 8.6 KB → 3.8 KB (56% smaller)
- **PassiveTreeViewer.js:** 24.1 KB → 11.2 KB (54% smaller)

**Total JS Savings:** ~55-60%

## Deployment Checklist

- [ ] Run `npm run production`
- [ ] Update template to use minified assets
- [ ] Set `APP_ENV=production` in `.env`
- [ ] Set `APP_DEBUG=false` in `.env`
- [ ] Enable OPcache in `php.ini`
- [ ] Configure nginx gzip compression
- [ ] Set proper cache headers for static assets
- [ ] Test all functionality in production mode

## Cache Busting

For production, add version query strings to assets:

```twig
<link rel="stylesheet" href="/assets/css/style.min.css?v={{ app_version }}">
<script type="module" src="/assets/js/main.js?v={{ app_version }}"></script>
```

Update version in `config/app.php`:

```php
'version' => '1.0.0', // Increment on each deploy
```

## Performance Monitoring

After deployment, verify optimizations:

```bash
# Check file sizes
du -h public/assets/css/style.min.css
du -h public/assets/js/dist/

# Test page load speed
curl -w "@curl-format.txt" -o /dev/null -s https://yoursite.com

# Check gzip compression
curl -H "Accept-Encoding: gzip" -I https://yoursite.com/assets/css/style.min.css
```

## Rollback

If issues occur, quickly rollback to development mode:

1. Switch template back to CDN
2. Update imports to non-minified versions
3. Set `APP_DEBUG=true`
4. Clear OPcache: `php-fpm reload`

## Continuous Deployment

For automated builds, add to your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Build assets
  run: |
    npm install
    npm run production

- name: Deploy
  run: |
    # Your deployment commands
```

## Troubleshooting

### CSS not applying

- Check file path in template
- Verify file was generated: `ls -lh public/assets/css/`
- Check nginx/apache is serving static files
- Clear browser cache

### JavaScript errors

- Check browser console for import errors
- Verify file paths in imports
- Test in development mode first
- Check for minification issues (rare)

### Large bundle size

- Run `npm run build:css` to remove unused classes
- Check if all imports are tree-shakeable
- Review `tailwind.config.js` content paths

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0
