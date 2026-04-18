import { readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  VPMPackageSchema,
  VPMRepository,
  VPMPackageIndex,
  type VPMPackage,
} from './schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function readLatestPackages(
  searchDir: string,
  existingVpmPath?: string
): Promise<VPMPackage[]> {
  const packages: VPMPackage[] = [];

  // Load existing packages from vpm.json if it exists
  if (existingVpmPath) {
    try {
      const existingContent = await readFile(existingVpmPath, 'utf-8');
      const existingVpm = JSON.parse(existingContent) as VPMRepository;

      for (const [pkgName, pkgIndex] of Object.entries(existingVpm.packages)) {
        for (const [version, pkgData] of Object.entries(pkgIndex.versions)) {
          const validatedPackage = VPMPackageSchema.parse(pkgData);
          console.log(
            `INFO: Loaded existing package: ${validatedPackage.name}@${validatedPackage.version}`
          );
          packages.push(validatedPackage);
        }
      }
    } catch (error) {
      console.log(
        `INFO: Could not load existing VPM repository from ${existingVpmPath}, starting fresh`
      );
    }
  }

  try {
    const files = await readdir(searchDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = join(searchDir, file);
      const content = await readFile(filePath, 'utf-8');

      try {
        const packageData = JSON.parse(content);
        const validatedPackage = VPMPackageSchema.parse(packageData);
        console.log(
          `INFO: Found package: ${validatedPackage.name}@${validatedPackage.version} in ${filePath}`
        );
        packages.push(validatedPackage);
      } catch (error) {
        console.error(`Error validating ${file}:`, error);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${searchDir}:`, error);
    process.exit(1);
  }

  return packages;
}

interface GenerateVPMRepoOptions {
  author?: string;
  name?: string;
  id?: string;
  url?: string;
}

async function generateVPMRepo(
  pkgDir: string,
  options: GenerateVPMRepoOptions = {},
  existingVpmPath?: string
): Promise<VPMRepository> {
  const {
    author = '朔日工房',
    name = '朔日工房',
    id = 'io.t7i',
    url = 'https://vpm.t7i.io/vpm.json',
  } = options;

  const vpm: VPMRepository = {
    author,
    name,
    id,
    url,
    packages: {},
  };

  const latestPackages = await readLatestPackages(pkgDir, existingVpmPath);

  for (const pkg of latestPackages) {
    if (!(pkg.name in vpm.packages)) {
      console.log(`INFO: Adding new package ${pkg.name} to VPM repository`);
      vpm.packages[pkg.name] = {
        versions: {
          [pkg.version]: pkg,
        },
      };
    } else {
      const existingVersions = vpm.packages[pkg.name].versions;
      if (pkg.version in existingVersions) {
        console.warn(
          `WARNING: Version ${pkg.version} already exists for package ${pkg.name}`
        );
      } else {
        console.log(
          `INFO: Adding version ${pkg.version} to package ${pkg.name}`
        );
        existingVersions[pkg.version] = pkg;
      }
    }
  }

  return vpm;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: npm run generate <output>');
    console.log('output are relative to the project directory');
    process.exit(1);
  }

  const projectDir = resolve(__dirname, '..');
  const packagesDir = join(projectDir, 'packages');
  const outputPath = resolve(projectDir, args[0]);

  const vpmRepo = await generateVPMRepo(packagesDir, {}, outputPath);

  const jsonOutput = JSON.stringify(vpmRepo, null, 2);
  console.log(jsonOutput);

  await writeFile(outputPath, jsonOutput, 'utf-8');
  console.log(`INFO: Updated VPM repository is ${outputPath}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
