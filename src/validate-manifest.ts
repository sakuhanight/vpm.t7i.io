import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { VPMPackageSchema, type VPMPackage } from './schemas.js';

async function validateManifest(filePath: string): Promise<void> {
  console.log(`Validating VPM manifest: ${filePath}\n`);

  try {
    const content = await readFile(resolve(filePath), 'utf-8');
    const packageData = JSON.parse(content);

    // Zodバリデーション
    const validated = VPMPackageSchema.parse(packageData);

    console.log('✓ Validation successful!\n');
    console.log('Package Information:');
    console.log(`  Name:         ${validated.name}`);
    console.log(`  Display Name: ${validated.displayName}`);
    console.log(`  Version:      ${validated.version}`);
    console.log(`  URL:          ${validated.url}`);
    console.log(`  Author:       ${typeof validated.author === 'string' ? validated.author : validated.author.name}`);

    if (validated.description) {
      console.log(`  Description:  ${validated.description}`);
    }
    if (validated.unity) {
      console.log(`  Unity:        ${validated.unity}`);
    }
    if (validated.license) {
      console.log(`  License:      ${validated.license}`);
    }

    if (validated.vpmDependencies) {
      console.log('\n  Dependencies:');
      for (const [dep, version] of Object.entries(validated.vpmDependencies)) {
        console.log(`    - ${dep}: ${version}`);
      }
    }

    console.log('\n=== Full Manifest ===');
    console.log(JSON.stringify(validated, null, 2));

  } catch (error: any) {
    console.error('✗ Validation failed!\n');

    if (error.name === 'ZodError') {
      console.error('Validation errors:');
      for (const issue of error.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
    } else if (error.code === 'ENOENT') {
      console.error(`File not found: ${filePath}`);
    } else {
      console.error(error.message || error);
    }

    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: npm run validate-manifest <manifest.json>');
    console.log('');
    console.log('Example:');
    console.log('  npm run validate-manifest packages/io.t7i.mypackage.json');
    process.exit(1);
  }

  await validateManifest(args[0]);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
