const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');

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
  console.log('✅ Fixed index.html - removed overflow: hidden and added cache-busting');
} else {
  console.error('❌ dist/index.html not found');
  process.exit(1);
}
