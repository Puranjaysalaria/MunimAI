/**
 * Phase 5: Cross-platform bundle secret check.
 * Builds the client bundle (`npm run build`) and fails if built files contain:
 * - Secret key names (GNANI_API_KEY, GNANI_ACCESS_KEY, TIMBRE_API_KEY, SUPABASE_SERVICE_ROLE_KEY)
 * - Actual secret values from process.env
 * - Gnani/Timbre API hostnames in client code
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const FORBIDDEN_KEY_NAMES = [
  'GNANI_API_KEY',
  'GNANI_ACCESS_KEY',
  'TIMBRE_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INTERNAL_STT_SECRET',
  'INTERNAL_TTS_SECRET',
];

function collectFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (/\.(js|mjs|html|css)$/i.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

export function scanBuiltFilesForSecrets(
  distDir: string,
  env: NodeJS.ProcessEnv = process.env
): Array<{ file: string; reason: string }> {
  const files = collectFiles(distDir);
  const findings: Array<{ file: string; reason: string }> = [];

  const forbiddenValues: Array<{ label: string; value: string }> = [];
  for (const keyName of FORBIDDEN_KEY_NAMES) {
    const val = env[keyName];
    if (val && val.trim().length >= 6) {
      forbiddenValues.push({ label: `env value of ${keyName}`, value: val.trim() });
    }
  }

  for (const urlVar of ['GNANI_STT_URL', 'GNANI_TTS_URL', 'TIMBRE_TTS_URL']) {
    const raw = env[urlVar];
    if (raw) {
      try {
        const host = new URL(raw).host;
        if (host) {
          forbiddenValues.push({ label: `API host from ${urlVar}`, value: host });
        }
      } catch {
        // ignore invalid URL
      }
    }
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const keyName of FORBIDDEN_KEY_NAMES) {
      if (content.includes(keyName)) {
        findings.push({ file, reason: `Contains secret key name "${keyName}"` });
      }
    }
    for (const item of forbiddenValues) {
      if (content.includes(item.value)) {
        findings.push({ file, reason: `Contains ${item.label}` });
      }
    }
  }

  return findings;
}

function main() {
  const root = process.cwd();
  const skipBuild = process.argv.includes('--skip-build');
  if (!skipBuild) {
    console.log('Building production client bundle for secret scan...');
    execSync('npm run build', { stdio: 'inherit', cwd: root });
  }

  const distDir = path.join(root, 'dist');
  const findings = scanBuiltFilesForSecrets(distDir, process.env);

  if (findings.length > 0) {
    console.error('❌ Secret leak check FAILED! Found sensitive strings in built client files:');
    for (const f of findings) {
      console.error(`  - ${f.file}: ${f.reason}`);
    }
    process.exit(1);
  }

  console.log('✅ Secret leak check PASSED: zero secret key names, env values, or Gnani API hosts in dist/.');
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.includes('check-no-secrets-in-bundle');

if (isDirectRun) {
  main();
}
