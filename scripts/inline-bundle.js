import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');

function stripSourceMapComments(source) {
  return source
    .replace(/\/\*# sourceMappingURL=.*?\*\//g, '')
    .replace(/\/\/# sourceMappingURL=.*$/gm, '');
}

function getAssetPath(assetUrl) {
  const cleanUrl = assetUrl.split('#')[0].split('?')[0].replace(/^\/+/, '');

  return path.join(distDir, cleanUrl);
}

function readAsset(assetUrl) {
  const assetPath = getAssetPath(assetUrl);

  if (!fs.existsSync(assetPath)) {
    throw new Error(`Asset not found: ${assetUrl}`);
  }

  return stripSourceMapComments(fs.readFileSync(assetPath, 'utf8'));
}

let html = fs.readFileSync(indexPath, 'utf8');
const inlineScripts = [];

html = html.replace(
  /<link\b[^>]*href=["']([^"']+\.css(?:[?#][^"']*)?)["'][^>]*>/gi,
  (_tag, href) => {
    const css = readAsset(href).replace(/<\/style/gi, '<\\/style');

    return `<style>\n${css}\n</style>`;
  },
);

html = html.replace(
  /<script\b[^>]*src=["']([^"']+\.js(?:[?#][^"']*)?)["'][^>]*>\s*<\/script>/gi,
  (_tag, src) => {
    const js = readAsset(src).replace(/<\/script/gi, '<\\/script');

    inlineScripts.push(`<script type="module">\n${js}\n</script>`);

    return '';
  },
);

if (inlineScripts.length > 0) {
  const scriptsHtml = `\n${inlineScripts.join('\n')}\n`;

  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${scriptsHtml}</body>`);
  } else {
    html += scriptsHtml;
  }
}

fs.writeFileSync(indexPath, html);

console.log('TagMe bundle was inlined into dist/index.html');
