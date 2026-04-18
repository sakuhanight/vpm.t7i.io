import { z } from 'zod';

/**
 * VPM package format schema
 * @see https://vcc.docs.vrchat.com/vpm/packages/#package-format
 */

export const AuthorSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  url: z.string().url().optional(),
});

export const BugsSchema = z.object({
  url: z.string().url().optional(),
  email: z.string().email().optional(),
});

export const RepositorySchema = z.object({
  type: z.string().optional(),
  url: z.string().url().optional(),
});

export const VPMPackageSchema = z.object({
  // Required fields for VPM
  name: z.string(),
  displayName: z.string(),
  version: z.string(),
  url: z.string().url(),
  author: z.union([AuthorSchema, z.string()]),

  // Recommended fields from Unity
  description: z.string().optional(),
  unity: z.string().optional(),

  // Optional fields
  documentationUrl: z.string().url().optional(),
  changelogUrl: z.string().url().optional(),
  vpmDependencies: z.record(z.string()).optional(),
  zipSHA256: z.string().optional(),
  license: z.string().optional(),

  // Additional npm-style fields
  homepage: z.string().url().optional(),
  bugs: z.union([BugsSchema, z.string().url()]).optional(),
  repository: z.union([RepositorySchema, z.string().url()]).optional(),
  private: z.boolean().optional(),
}).passthrough(); // Allow extra fields

export const VPMPackageIndexSchema = z.object({
  versions: z.record(z.string(), VPMPackageSchema),
});

export const VPMRepositorySchema = z.object({
  author: z.string(),
  name: z.string(),
  id: z.string(),
  url: z.string().url(),
  packages: z.record(z.string(), VPMPackageIndexSchema),
});

export type Author = z.infer<typeof AuthorSchema>;
export type Bugs = z.infer<typeof BugsSchema>;
export type Repository = z.infer<typeof RepositorySchema>;
export type VPMPackage = z.infer<typeof VPMPackageSchema>;
export type VPMPackageIndex = z.infer<typeof VPMPackageIndexSchema>;
export type VPMRepository = z.infer<typeof VPMRepositorySchema>;
