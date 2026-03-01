const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const appDir = path.join(distDir, 'app');
const websiteDir = path.join(__dirname, 'website');

// Step 1: Fix the Expo-generated index.html
const indexPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');

  // Remove the overflow: hidden line
  html = html.replace(/\s*overflow:\s*hidden;\s*/g, '');

  // Clean up the empty body style block
  html = html.replace(/\/\*[^*]*\*\/\s*body\s*{\s*}\s*/g, '');

  // Add cache-busting meta tag with timestamp
  const timestamp = Date.now();
  html = html.replace(
    '<meta name="viewport"',
    `<meta name="cache-version" content="${timestamp}" />\n    <meta name="viewport"`
  );

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✅ Fixed app index.html - removed overflow: hidden and added cache-busting');
} else {
  console.error('❌ dist/index.html not found');
  process.exit(1);
}

// Helper: recursive directory copy
function copyDirSync(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    // Skip Railway/package config files - not needed in dist
    if (entry.name === 'railway.json' || entry.name === 'package.json' || entry.name === 'node_modules') {
      continue;
    }
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper: recursive directory delete
function rmDirSync(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rmDirSync(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }
  fs.rmdirSync(dir);
}

// Step 2: Copy app files into dist/app/ then clean originals
// (using copy+delete instead of rename to avoid EXDEV errors in Docker)
console.log('📦 Copying app files to dist/app/...');

// Create app directory
if (!fs.existsSync(appDir)) {
  fs.mkdirSync(appDir, { recursive: true });
}

// Get all files/dirs in dist except 'app' itself
const distContents = fs.readdirSync(distDir).filter(item => item !== 'app');

// Copy everything into app/, then delete originals
for (const item of distContents) {
  const src = path.join(distDir, item);
  const dest = path.join(appDir, item);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDirSync(src, dest);
    rmDirSync(src);
  } else {
    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
  }
}
console.log(`✅ Moved ${distContents.length} items to dist/app/`);

// Step 2b: Copy _expo and assets back to dist root (app references them with absolute paths like /_expo/...)
const appAssetDirs = ['_expo', 'assets'];
for (const dir of appAssetDirs) {
  const srcDir = path.join(appDir, dir);
  if (fs.existsSync(srcDir)) {
    copyDirSync(srcDir, path.join(distDir, dir));
    console.log(`✅ Copied ${dir}/ to dist root for app asset paths`);
  }
}

// Step 3: Copy website files into dist/ root
console.log('🌐 Copying website files to dist/...');

copyDirSync(websiteDir, distDir);
console.log('✅ Website files copied to dist/');

// Step 4: Create serve.json for routing
const serveConfig = {
  "rewrites": [
    { "source": "/app/**", "destination": "/app/index.html" }
  ]
};

fs.writeFileSync(path.join(distDir, 'serve.json'), JSON.stringify(serveConfig, null, 2));
console.log('✅ Created serve.json with app routing');

console.log('\n🚀 Build complete! Website at / and app at /app/');
