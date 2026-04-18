import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { input, confirm, select } from '@inquirer/prompts';
import { VPMPackageSchema, type VPMPackage } from './schemas.js';

async function createInteractiveManifest() {
  console.log('=== VPM Package Manifest Creator ===\n');

  // ソースファイルの選択
  const useSourceFile = await confirm({
    message: 'Unity package.json から情報を読み込みますか？',
    default: true,
  });

  let basePackage: any = {};

  if (useSourceFile) {
    const sourceFile = await input({
      message: 'Unity package.json のパス:',
      default: 'package.json',
    });

    try {
      const content = await readFile(resolve(sourceFile), 'utf-8');
      basePackage = JSON.parse(content);
      console.log(`✓ ${sourceFile} を読み込みました\n`);
    } catch (error) {
      console.error(`✗ ファイルの読み込みに失敗しました: ${error}`);
      process.exit(1);
    }
  }

  // 必須フィールド
  const name = await input({
    message: 'Package name (例: io.t7i.mypackage):',
    default: basePackage.name,
    validate: (value) => value.length > 0 || 'Package name は必須です',
  });

  const displayName = await input({
    message: 'Display name:',
    default: basePackage.displayName || name,
    validate: (value) => value.length > 0 || 'Display name は必須です',
  });

  const version = await input({
    message: 'Version (例: 1.0.0):',
    default: basePackage.version || '1.0.0',
    validate: (value) => /^\d+\.\d+\.\d+/.test(value) || 'semver形式で入力してください',
  });

  // URL生成方法の選択
  const urlMethod = await select({
    message: 'リリースZIPのURL指定方法:',
    choices: [
      { name: 'GitHubリポジトリURLから自動生成', value: 'auto' },
      { name: 'URLを直接指定', value: 'manual' },
    ],
  });

  let url = '';
  if (urlMethod === 'auto') {
    const repoUrl = await input({
      message: 'GitHubリポジトリURL (例: https://github.com/user/repo):',
      validate: (value) => value.startsWith('http') || 'URLを入力してください',
    });

    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || name;
    url = `${repoUrl}/releases/download/v${version}/${repoName}-v${version}.zip`;
    console.log(`生成されたURL: ${url}`);
  } else {
    url = await input({
      message: 'リリースZIPのURL:',
      validate: (value) => value.startsWith('http') || 'URLを入力してください',
    });
  }

  // Author
  const authorType = await select({
    message: 'Author形式:',
    choices: [
      { name: 'シンプル (文字列)', value: 'string' },
      { name: '詳細 (オブジェクト)', value: 'object' },
    ],
  });

  let author: any;
  if (authorType === 'string') {
    author = await input({
      message: 'Author名:',
      default: typeof basePackage.author === 'string' ? basePackage.author : basePackage.author?.name || '朔日工房',
    });
  } else {
    const authorName = await input({
      message: 'Author名:',
      default: basePackage.author?.name || '朔日工房',
    });
    const authorEmail = await input({
      message: 'Author email (任意):',
      default: basePackage.author?.email || '',
    });
    const authorUrl = await input({
      message: 'Author URL (任意):',
      default: basePackage.author?.url || '',
    });

    author = { name: authorName };
    if (authorEmail) author.email = authorEmail;
    if (authorUrl) author.url = authorUrl;
  }

  // オプションフィールド
  const description = await input({
    message: 'Description (任意):',
    default: basePackage.description || '',
  });

  const unity = await input({
    message: 'Unity version (例: 2022.3, 任意):',
    default: basePackage.unity || '',
  });

  const addOptionalFields = await confirm({
    message: '追加のオプションフィールドを設定しますか？',
    default: false,
  });

  const vpmPackage: any = {
    name,
    displayName,
    version,
    url,
    author,
  };

  if (description) vpmPackage.description = description;
  if (unity) vpmPackage.unity = unity;

  if (addOptionalFields) {
    const license = await input({
      message: 'License (任意):',
      default: basePackage.license || '',
    });
    const homepage = await input({
      message: 'Homepage URL (任意):',
      default: basePackage.homepage || '',
    });
    const documentationUrl = await input({
      message: 'Documentation URL (任意):',
      default: basePackage.documentationUrl || '',
    });
    const changelogUrl = await input({
      message: 'Changelog URL (任意):',
      default: basePackage.changelogUrl || '',
    });
    const zipSHA256 = await input({
      message: 'ZIP SHA256 hash (任意):',
      default: '',
    });

    if (license) vpmPackage.license = license;
    if (homepage) vpmPackage.homepage = homepage;
    if (documentationUrl) vpmPackage.documentationUrl = documentationUrl;
    if (changelogUrl) vpmPackage.changelogUrl = changelogUrl;
    if (zipSHA256) vpmPackage.zipSHA256 = zipSHA256;
  }

  // vpmDependencies
  if (basePackage.vpmDependencies) {
    vpmPackage.vpmDependencies = basePackage.vpmDependencies;
  }

  // その他のフィールドをコピー
  if (basePackage.repository) vpmPackage.repository = basePackage.repository;
  if (basePackage.bugs) vpmPackage.bugs = basePackage.bugs;

  // バリデーション
  try {
    const validated = VPMPackageSchema.parse(vpmPackage);

    console.log('\n=== Generated VPM Package Manifest ===');
    console.log(JSON.stringify(validated, null, 2));
    console.log('');

    const shouldSave = await confirm({
      message: 'このマニフェストを保存しますか？',
      default: true,
    });

    if (shouldSave) {
      const outputPath = await input({
        message: '出力先パス:',
        default: `packages/${name}.json`,
      });

      const jsonOutput = JSON.stringify(validated, null, 2);
      await writeFile(resolve(outputPath), jsonOutput, 'utf-8');
      console.log(`✓ VPM manifest を ${outputPath} に保存しました`);
    }

    return validated;
  } catch (error) {
    console.error('\n✗ VPM package validation failed:', error);
    process.exit(1);
  }
}

createInteractiveManifest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
