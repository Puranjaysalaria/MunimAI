/**
 * Compiles api/ with tsconfig.api.json (NodeNext ESM) into a temporary directory,
 * imports every compiled handler under plain Node ESM, and calls each handler
 * with a fake unauthenticated request + fake response.
 */

import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function makeMockRes() {
  const headers: Record<string, string> = {};
  const res: any = {
    statusCode: 200,
    body: null as unknown,
    ended: false,
    setHeader(k: string, v: string) {
      headers[k.toLowerCase()] = v;
    },
    getHeader(k: string) {
      return headers[k.toLowerCase()];
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
  return res;
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'munim-api-esm-'));
  try {
    execSync(`npx tsc -p tsconfig.api.json --noEmit false --outDir "${tmpDir}"`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    // Ensure Node treats the temp output directory as ESM and can resolve node_modules
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ type: 'module' }));
    fs.symlinkSync(
      path.join(process.cwd(), 'node_modules'),
      path.join(tmpDir, 'node_modules'),
      'junction'
    );

    const files = fs
      .readdirSync(tmpDir)
      .filter((f) => f.endsWith('.js') && !f.startsWith('_'))
      .sort();

    assert.ok(files.includes('gnani-stt.js'), 'Missing compiled gnani-stt.js');
    assert.ok(files.includes('gnani-tts.js'), 'Missing compiled gnani-tts.js');

    for (const file of files) {
      const fullPath = path.join(tmpDir, file);
      const mod = await import(pathToFileURL(fullPath).href);
      assert.equal(typeof mod.default, 'function', `${file} must export default handler`);

      const req: any = { method: 'POST', headers: {}, body: {} };
      const res = makeMockRes();
      await mod.default(req, res);

      if (file === 'gnani-stt.js' || file === 'gnani-tts.js') {
        assert.equal(
          res.statusCode,
          401,
          `${file} must return 401 when Authorization header is missing, got ${res.statusCode}`
        );
      }
      console.log(`[ok] Plain Node ESM loaded & invoked ${file} -> HTTP ${res.statusCode}`);
    }

    console.log('✅ All api/ handlers compiled and loaded cleanly under plain Node ESM.');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('❌ test:api-load failed:', err);
  process.exit(1);
});
