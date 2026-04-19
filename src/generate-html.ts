import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { VPMRepositorySchema, type VPMRepository } from './schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface GenerateHTMLOptions {
  vpmJsonPath: string;
  outputPath: string;
  templatePath?: string;
}

async function generateHTML(options: GenerateHTMLOptions): Promise<void> {
  const { vpmJsonPath, outputPath } = options;
  let { templatePath } = options;

  console.log(`Reading VPM repository from ${vpmJsonPath}`);
  const vpmContent = await readFile(vpmJsonPath, 'utf-8');
  const vpm = VPMRepositorySchema.parse(JSON.parse(vpmContent));

  console.log(`Found ${Object.keys(vpm.packages).length} packages`);

  // Use default template if not specified
  if (!templatePath) {
    templatePath = join(__dirname, 'templates', 'default.html');
    console.log(`Using default template from ${templatePath}`);
  } else {
    console.log(`Using custom template from ${templatePath}`);
  }

  const template = await readFile(templatePath, 'utf-8');

  const packageCount = Object.keys(vpm.packages).length;
  const totalVersions = Object.values(vpm.packages).reduce(
    (sum, pkg) => sum + Object.keys(pkg.versions).length,
    0
  );

  // Template variable replacement
  const html = template
    .replace(/\{\{name\}\}/g, vpm.name)
    .replace(/\{\{author\}\}/g, vpm.author)
    .replace(/\{\{url\}\}/g, vpm.url)
    .replace(/\{\{packageCount\}\}/g, String(packageCount))
    .replace(/\{\{totalVersions\}\}/g, String(totalVersions))
    .replace(/\{\{timestamp\}\}/g, new Date().toISOString())
    .replace(/\{\{packagesJson\}\}/g, JSON.stringify(vpm.packages, null, 2));

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
