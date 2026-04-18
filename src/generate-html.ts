import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { VPMRepositorySchema, type VPMRepository } from './schemas.js';

interface GenerateHTMLOptions {
  vpmJsonPath: string;
  outputPath: string;
  templatePath?: string;
}

function generateDefaultHTML(vpm: VPMRepository): string {
  const packageList = Object.entries(vpm.packages)
    .map(([name, pkgIndex]) => {
      const versions = Object.entries(pkgIndex.versions);
      const latestVersion = versions[versions.length - 1];
      const [version, pkg] = latestVersion;

      const authorName = typeof pkg.author === 'string'
        ? pkg.author
        : pkg.author.name;

      return {
        name: pkg.name,
        displayName: pkg.displayName,
        version,
        description: pkg.description || '',
        author: authorName,
        url: pkg.url,
        homepage: pkg.homepage,
        documentationUrl: pkg.documentationUrl,
        license: pkg.license,
        unity: pkg.unity,
        allVersions: versions.map(([v]) => v).reverse(),
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${vpm.name} - VPM Repository</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem 1rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }

    h1 {
      color: #667eea;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #666;
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }

    .vpm-url {
      background: #f5f5f5;
      border-left: 4px solid #667eea;
      padding: 1rem;
      border-radius: 6px;
      font-family: monospace;
      font-size: 0.95rem;
      word-break: break-all;
      margin-top: 1rem;
    }

    .vpm-url-label {
      font-weight: bold;
      color: #667eea;
      margin-bottom: 0.5rem;
    }

    .stats {
      display: flex;
      gap: 2rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #667eea;
    }

    .stat-label {
      color: #666;
      font-size: 0.9rem;
    }

    .packages {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .package-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .package-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    }

    .package-header {
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .package-name {
      font-size: 1.4rem;
      font-weight: bold;
      color: #333;
      margin-bottom: 0.25rem;
    }

    .package-id {
      font-size: 0.85rem;
      color: #999;
      font-family: monospace;
    }

    .package-version {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: bold;
      margin-top: 0.5rem;
    }

    .package-description {
      color: #666;
      margin-bottom: 1rem;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .package-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.85rem;
      color: #666;
    }

    .meta-icon {
      color: #667eea;
    }

    .package-links {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background 0.2s, transform 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
      transform: translateY(-2px);
    }

    .versions-dropdown {
      position: relative;
      display: inline-block;
    }

    .versions-btn {
      background: #f0f0f0;
      color: #333;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .versions-btn:hover {
      background: #e0e0e0;
    }

    footer {
      text-align: center;
      margin-top: 3rem;
      color: white;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .packages {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 2rem;
      }

      .stats {
        flex-direction: column;
        gap: 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${vpm.name}</h1>
      <p class="subtitle">VPM Package Repository by ${vpm.author}</p>

      <div class="vpm-url">
        <div class="vpm-url-label">📦 VPM Repository URL:</div>
        <code>${vpm.url}</code>
      </div>

      <div class="stats">
        <div class="stat">
          <span class="stat-value">${packageList.length}</span>
          <span class="stat-label">パッケージ</span>
        </div>
        <div class="stat">
          <span class="stat-value">${Object.values(vpm.packages).reduce((sum, pkg) => sum + Object.keys(pkg.versions).length, 0)}</span>
          <span class="stat-label">総バージョン数</span>
        </div>
      </div>
    </header>

    <div class="packages">
      ${packageList.map(pkg => `
        <div class="package-card">
          <div class="package-header">
            <div class="package-name">${pkg.displayName}</div>
            <div class="package-id">${pkg.name}</div>
            <span class="package-version">v${pkg.version}</span>
          </div>

          ${pkg.description ? `<p class="package-description">${pkg.description}</p>` : ''}

          <div class="package-meta">
            <div class="meta-item">
              <span class="meta-icon">👤</span>
              <span>${pkg.author}</span>
            </div>
            ${pkg.license ? `
              <div class="meta-item">
                <span class="meta-icon">📄</span>
                <span>${pkg.license}</span>
              </div>
            ` : ''}
            ${pkg.unity ? `
              <div class="meta-item">
                <span class="meta-icon">🎮</span>
                <span>Unity ${pkg.unity}+</span>
              </div>
            ` : ''}
            ${pkg.allVersions.length > 1 ? `
              <div class="meta-item">
                <span class="meta-icon">📚</span>
                <span>${pkg.allVersions.length} versions</span>
              </div>
            ` : ''}
          </div>

          <div class="package-links">
            <a href="${pkg.url}" class="btn btn-primary" download>⬇️ Download</a>
            ${pkg.documentationUrl ? `<a href="${pkg.documentationUrl}" class="btn btn-secondary" target="_blank">📖 Docs</a>` : ''}
            ${pkg.homepage ? `<a href="${pkg.homepage}" class="btn btn-secondary" target="_blank">🏠 Homepage</a>` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <footer>
      <p>Powered by VPM (VRChat Package Manager)</p>
      <p>Generated at ${new Date().toISOString()}</p>
    </footer>
  </div>
</body>
</html>`;
}

async function generateHTML(options: GenerateHTMLOptions): Promise<void> {
  const { vpmJsonPath, outputPath, templatePath } = options;

  console.log(`Reading VPM repository from ${vpmJsonPath}`);
  const vpmContent = await readFile(vpmJsonPath, 'utf-8');
  const vpm = VPMRepositorySchema.parse(JSON.parse(vpmContent));

  console.log(`Found ${Object.keys(vpm.packages).length} packages`);

  let html: string;
  if (templatePath) {
    console.log(`Using custom template from ${templatePath}`);
    const template = await readFile(templatePath, 'utf-8');
    // Simple template variable replacement
    html = template
      .replace(/\{\{name\}\}/g, vpm.name)
      .replace(/\{\{author\}\}/g, vpm.author)
      .replace(/\{\{url\}\}/g, vpm.url)
      .replace(/\{\{packages\}\}/g, JSON.stringify(vpm.packages, null, 2));
  } else {
    console.log('Generating HTML with default template');
    html = generateDefaultHTML(vpm);
  }

  await writeFile(outputPath, html, 'utf-8');
  console.log(`HTML page generated: ${outputPath}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npm run generate-html <vpm.json> <output.html> [template.html]');
    console.log('');
    console.log('Example:');
    console.log('  npm run generate-html vpm.json index.html');
    console.log('  npm run generate-html vpm.json index.html custom-template.html');
    process.exit(1);
  }

  const vpmJsonPath = resolve(args[0]);
  const outputPath = resolve(args[1]);
  const templatePath = args[2] ? resolve(args[2]) : undefined;

  await generateHTML({ vpmJsonPath, outputPath, templatePath });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
