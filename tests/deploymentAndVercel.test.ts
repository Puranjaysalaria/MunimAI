import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getDailyQuotaStatus, incrementDailyScan } from '../api/bill-scan';

describe('Vercel & Production Deployment Invariants', () => {
  const rootDir = path.resolve(__dirname, '..');

  describe('1. Vercel Configuration & Routing Rewrites', () => {
    it('provides a valid vercel.json with cleanUrls and SPA rewrites', () => {
      const vercelJsonPath = path.join(rootDir, 'vercel.json');
      expect(fs.existsSync(vercelJsonPath)).toBe(true);

      const content = fs.readFileSync(vercelJsonPath, 'utf8');
      const config = JSON.parse(content);

      expect(config.cleanUrls).toBe(true);
      expect(Array.isArray(config.rewrites)).toBe(true);
      expect(config.rewrites.length).toBeGreaterThan(0);

      // Verify explicit api routing rule
      const apiRewrite = config.rewrites.find((r: any) => r.source === '/api/(.*)');
      expect(apiRewrite).toBeDefined();
      expect(apiRewrite.destination).toBe('/api/$1');

      // Verify explicit pay routing rule
      const payRewrite = config.rewrites.find((r: any) => r.source === '/pay');
      expect(payRewrite).toBeDefined();

      const mainRewrite = config.rewrites.find((r: any) => r.destination === '/index.html');
      expect(mainRewrite).toBeDefined();

      // Negative lookahead regex excludes /pay and /api
      expect(mainRewrite.source).toContain('pay');
      expect(mainRewrite.source).toContain('api');

      // Vercel anchors rewrite source patterns to the full request path
      const pattern = new RegExp('^' + mainRewrite.source + '$');

      // Should NOT match /pay or /pay/ or /pay?pa=...
      expect(pattern.test('/pay')).toBe(false);
      expect(pattern.test('/pay/')).toBe(false);
      expect(pattern.test('/pay/index.html')).toBe(false);
      expect(pattern.test('/api/bill-scan')).toBe(false);
      expect(pattern.test('/assets/index.js')).toBe(false);
      expect(pattern.test('/favicon.ico')).toBe(false);

      // SHOULD match SPA app routes
      expect(pattern.test('/stock')).toBe(true);
      expect(pattern.test('/ledger')).toBe(true);
      expect(pattern.test('/today')).toBe(true);
      expect(pattern.test('/orders')).toBe(true);
    });

    it('verifies that all PWA and web manifest icons exist in public/', () => {
      const publicDir = path.join(rootDir, 'public');
      const requiredIcons = [
        'favicon.ico',
        'favicon.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'apple-touch-icon.png',
      ];
      for (const icon of requiredIcons) {
        const iconPath = path.join(publicDir, icon);
        expect(fs.existsSync(iconPath)).toBe(true);
        const stat = fs.statSync(iconPath);
        expect(stat.size).toBeGreaterThan(0);
      }
    });
  });

  describe('2. Service Worker & PWA Isolation for Pay Page', () => {
    it('configures workbox navigateFallbackDenylist and excludes pay page from precaching in vite.config.mjs', () => {
      const viteConfigPath = path.join(rootDir, 'vite.config.mjs');
      expect(fs.existsSync(viteConfigPath)).toBe(true);

      const content = fs.readFileSync(viteConfigPath, 'utf8');

      // Navigation fallback denylist for /pay
      expect(content).toContain('navigateFallbackDenylist');
      expect(content).toMatch(/navigateFallbackDenylist:\s*\[.*\/pay/);

      // Exclude /pay from precache
      expect(content).toContain('globIgnores');
      expect(content).toMatch(/globIgnores:\s*\[.*pay/);
    });
  });

  describe('3. Environment Variables & Secret Invariants', () => {
    it('ensures no secret uses a VITE_ prefix in .env.example', () => {
      const envExamplePath = path.join(rootDir, '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);

      const content = fs.readFileSync(envExamplePath, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const [key] = trimmed.split('=');
        if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')) {
          if (key === 'VITE_SUPABASE_ANON_KEY') {
            // Anon key is designed to be public in Supabase client architecture
            continue;
          }
          // No secret should have VITE_
          expect(key.startsWith('VITE_')).toBe(false);
        }
      }

      // Explicitly check that VITE_GEMINI_API_KEY does NOT exist
      expect(content).not.toContain('VITE_GEMINI_API_KEY');
      expect(content).toContain('GEMINI_API_KEY');
      expect(content).toContain('BILL_SCAN_DAILY_CAP');
    });

    it('confirms that VITE_GEMINI_API_KEY is not referenced anywhere in src/', () => {
      const srcDir = path.join(rootDir, 'src');

      function checkDir(dir: string) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            checkDir(fullPath);
          } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            expect(fileContent).not.toContain('VITE_GEMINI_API_KEY');
          }
        }
      }

      checkDir(srcDir);
    });
  });

  describe('4. Serverless Bill Scan Function (/api/bill-scan)', () => {
    it('enforces per-shop daily quota and returns exceeded status when cap is reached', () => {
      const testShopId = `test-shop-${Date.now()}`;
      const cap = 3;

      let status = getDailyQuotaStatus(testShopId, cap);
      expect(status.scansUsed).toBe(0);
      expect(status.remainingToday).toBe(3);
      expect(status.isExceeded).toBe(false);

      // Increment scans
      incrementDailyScan(testShopId);
      incrementDailyScan(testShopId);
      status = getDailyQuotaStatus(testShopId, cap);
      expect(status.scansUsed).toBe(2);
      expect(status.remainingToday).toBe(1);
      expect(status.isExceeded).toBe(false);

      // Third scan reaches cap
      incrementDailyScan(testShopId);
      status = getDailyQuotaStatus(testShopId, cap);
      expect(status.scansUsed).toBe(3);
      expect(status.remainingToday).toBe(0);
      expect(status.isExceeded).toBe(true);
    });
  });

  describe('5. Deployment Documentation (DEPLOY.md)', () => {
    it('contains comprehensive Supabase redirect URL instructions and post-deploy checklist', () => {
      const deployMdPath = path.join(rootDir, 'DEPLOY.md');
      expect(fs.existsSync(deployMdPath)).toBe(true);

      const content = fs.readFileSync(deployMdPath, 'utf8');
      expect(content).toContain('Supabase Backend Setup');
      expect(content).toContain('Redirect URLs');
      expect(content).toContain('Vercel Deployment Steps');
      expect(content).toContain('Post-Deployment Verification Checklist');
      expect(content).toContain('GEMINI_API_KEY');
      expect(content).toContain('BILL_SCAN_DAILY_CAP');
    });
  });
});
