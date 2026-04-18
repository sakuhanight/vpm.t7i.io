import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { VPMPackageSchema, type VPMPackage } from './schemas.js';

interface CreateManifestOptions {
  sourcePackageJson?: string;
  outputPath?: string;
  releaseUrl?: string;
  repositoryUrl?: string;
  zipSHA256?: string;
}

/**
 * Unity package.json から VPM package manifest を生成
 */
async function createVPMManifest(
  options: CreateManifestOptions
): Promise<VPMPackage> {
  const {
    sourcePackageJson,
    releaseUrl,
    repositoryUrl,
    zipSHA256,
  } = options;

  let basePackage: any = {};

  // ソースのpackage.jsonがあれば読み込む
  if (sourcePackageJson) {
    try {
      const content = await readFile(sourcePackageJson, 'utf-8');
      basePackage = JSON.parse(content);
      console.log(`INFO: Loaded base package from ${sourcePackageJson}`);
    } catch (error) {
      console.error(`ERROR: Could not read ${sourcePackageJson}:`, error);
      process.exit(1);
    }
  }

  // VPM用のフィールドを構築
  const vpmPackage: any = {
    name: basePackage.name,
    displayName: basePackage.displayName,
    version: basePackage.version,
    description: basePackage.description,
    unity: basePackage.unity,
    author: basePackage.author,
  };

  // URLの設定
  if (releaseUrl) {
    vpmPackage.url = releaseUrl;
  } else if (repositoryUrl && basePackage.version) {
    // リポジトリURLから自動生成
    const repoName = repositoryUrl.split('/').pop()?.replace('.git', '');
    vpmPackage.url = `${repositoryUrl}/releases/download/v${basePackage.version}/${repoName}-v${basePackage.version}.zip`;
  }

  // オプションフィールド
  if (basePackage.documentationUrl) {
    vpmPackage.documentationUrl = basePackage.documentationUrl;
  }
  if (basePackage.changelogUrl) {
    vpmPackage.changelogUrl = basePackage.changelogUrl;
  }
  if (basePackage.license) {
    vpmPackage.license = basePackage.license;
  }
  if (basePackage.homepage) {
    vpmPackage.homepage = basePackage.homepage;
  }
  if (basePackage.bugs) {
    vpmPackage.bugs = basePackage.bugs;
  }
  if (basePackage.repository) {
    vpmPackage.repository = basePackage.repository;
  }

  // vpmDependencies
  if (basePackage.vpmDependencies) {
    vpmPackage.vpmDependencies = basePackage.vpmDependencies;
  }

  // zipSHA256
  if (zipSHA256) {
    vpmPackage.zipSHA256 = zipSHA256;
  }

  // バリデーション
  try {
    const validated = VPMPackageSchema.parse(vpmPackage);
    console.log(`INFO: Successfully validated VPM package manifest`);
    return validated;
  } catch (error) {
    console.error('ERROR: VPM package validation failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: npm run create-manifest <source-package.json> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --output <path>          Output path for VPM manifest (default: stdout)');
    console.log('  --release-url <url>      Direct URL to release ZIP');
    console.log('  --repo-url <url>         Repository URL (auto-generates release URL)');
    console.log('  --sha256 <hash>          SHA256 hash of the ZIP file');
    console.log('');
    console.log('Example:');
    console.log('  npm run create-manifest package.json --output vpm-package.json --repo-url https://github.com/user/repo');
    process.exit(1);
  }

  const sourcePackageJson = resolve(args[0]);
  let outputPath: string | undefined;
  let releaseUrl: string | undefined;
  let repositoryUrl: string | undefined;
  let zipSHA256: string | undefined;

  // Parse options
  for (let i = 1; i < args.length; i += 2) {
    const option = args[i];
    const value = args[i + 1];

    switch (option) {
      case '--output':
      case '-o':
        outputPath = resolve(value);
        break;
      case '--release-url':
      case '-u':
        releaseUrl = value;
        break;
      case '--repo-url':
      case '-r':
        repositoryUrl = value;
        break;
      case '--sha256':
      case '-s':
        zipSHA256 = value;
        break;
      default:
        console.error(`Unknown option: ${option}`);
        process.exit(1);
    }
  }

  const vpmPackage = await createVPMManifest({
    sourcePackageJson,
    outputPath,
    releaseUrl,
    repositoryUrl,
    zipSHA256,
  });

  const jsonOutput = JSON.stringify(vpmPackage, null, 2);

  if (outputPath) {
    await writeFile(outputPath, jsonOutput, 'utf-8');
    console.log(`INFO: VPM manifest written to ${outputPath}`);
  } else {
    console.log('');
    console.log('=== Generated VPM Package Manifest ===');
    console.log(jsonOutput);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
