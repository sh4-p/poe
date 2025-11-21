#!/usr/bin/env node

/**
 * JavaScript Minification Script
 * Minifies all JavaScript files for production
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const srcDir = path.join(__dirname, '../public/assets/js');
const destDir = path.join(__dirname, '../public/assets/js/dist');

// Ensure dest directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Files to minify
const files = [
    'main.js',
    'modules/api.js',
    'modules/utils.js',
    'modules/BuildManager.js',
    'modules/ItemSelector.js',
    'modules/PassiveTreeViewer.js'
];

console.log('🔧 Minifying JavaScript files...\n');

let totalOriginalSize = 0;
let totalMinifiedSize = 0;

async function minifyFiles() {
    for (const file of files) {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file.replace('.js', '.min.js'));

        try {
            const code = fs.readFileSync(srcPath, 'utf8');
            const originalSize = Buffer.byteLength(code, 'utf8');

            const result = await minify(code, {
                compress: {
                    dead_code: true,
                    drop_console: false,
                    drop_debugger: true,
                    keep_classnames: true,
                    keep_fnames: false,
                    passes: 2
                },
                mangle: {
                    keep_classnames: true,
                    keep_fnames: false
                },
                format: {
                    comments: false
                }
            });

            if (result.error) {
                console.error(`✗ Error minifying ${file}:`, result.error);
                continue;
            }

            const minifiedSize = Buffer.byteLength(result.code, 'utf8');
            const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

            // Ensure dest subdirectory exists
            const destSubDir = path.dirname(destPath);
            if (!fs.existsSync(destSubDir)) {
                fs.mkdirSync(destSubDir, { recursive: true });
            }

            fs.writeFileSync(destPath, result.code);

            console.log(`✓ ${file}`);
            console.log(`  ${(originalSize / 1024).toFixed(2)} KB → ${(minifiedSize / 1024).toFixed(2)} KB (${savings}% smaller)\n`);

            totalOriginalSize += originalSize;
            totalMinifiedSize += minifiedSize;

        } catch (error) {
            console.error(`✗ Error processing ${file}:`, error.message);
        }
    }

    const totalSavings = ((1 - totalMinifiedSize / totalOriginalSize) * 100).toFixed(1);

    console.log('═══════════════════════════════════════');
    console.log(`Total: ${(totalOriginalSize / 1024).toFixed(2)} KB → ${(totalMinifiedSize / 1024).toFixed(2)} KB`);
    console.log(`Savings: ${totalSavings}%`);
    console.log('═══════════════════════════════════════');
    console.log('\n✓ Minification complete!');
}

minifyFiles().catch(console.error);
