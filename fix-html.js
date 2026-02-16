const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Remove the overflow: hidden line
  html = html.replace(/\s*overflow:\s*hidden;\s*/g, '');
  
  // Clean up the empty body style block
  html = html.replace(/\/\*[^*]*\*\/\s*body\s*{\s*}\s*/g, '');
  
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✅ Fixed index.html - removed overflow: hidden');
} else {
  console.error('❌ dist/index.html not found');
  process.exit(1);
}
