const fs = require('fs');
const path = require('path');

const distDir = path.resolve(process.cwd(), 'dist');
const indexFile = path.join(distDir, 'index.html');
const fallbackFile = path.join(distDir, '200.html');

try {
  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  if (!fs.existsSync(indexFile)) {
    console.error('index.html not found in dist. Build may have failed.');
    process.exit(1);
  }

  fs.copyFileSync(indexFile, fallbackFile);
  console.log('Copied index.html -> 200.html');
} catch (err) {
  console.error('Failed to copy index.html to 200.html', err);
  process.exit(1);
}
