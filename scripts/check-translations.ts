import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const i18nDir = path.join(rootDir, 'src', 'i18n');

const LANGUAGES = ['en', 'hi', 'pa', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'];
const NATIVE_REVIEW_LANGUAGES = ['gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'pa'];

/**
 * Loads and transpiles a TypeScript i18n locale file cleanly
 */
function loadLocale(lang: string): Record<string, any> {
  const filePath = path.join(i18nDir, `${lang}.ts`);
  const raw = fs.readFileSync(filePath, 'utf8').replace(/import\s+[^;]+;/, '');
  const js = ts.transpileModule(raw, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;

  const mod: { exports: any } = { exports: {} };
  const fn = new Function('exports', 'module', js);
  fn(mod.exports, mod);
  return (Object.values(mod.exports)[0] as Record<string, any>) || {};
}

/**
 * Recursively collect all dot-notated paths from an object
 */
function getLeafKeyPaths(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getLeafKeyPaths(v, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

function getValueByPath(obj: any, pathStr: string): any {
  return pathStr.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

function main() {
  console.log('🔍 Checking translations against English baseline...\n');

  const en = loadLocale('en');
  const enKeys = getLeafKeyPaths(en);
  const totalEnKeys = enKeys.length;

  const missingReport: Record<string, string[]> = {};
  const nativeReviewReport: Record<string, string[]> = {};

  for (const lang of LANGUAGES) {
    if (lang === 'en') continue;

    const localeObj = loadLocale(lang);
    const missingKeys: string[] = [];

    for (const keyPath of enKeys) {
      const val = getValueByPath(localeObj, keyPath);
      if (val === undefined || val === null || val === '') {
        missingKeys.push(keyPath);
      }
    }

    if (missingKeys.length > 0) {
      missingReport[lang] = missingKeys;
    }

    // Mark new slip labels as needing native review
    if (NATIVE_REVIEW_LANGUAGES.includes(lang)) {
      const slipKeys = enKeys
        .filter((k) => k.startsWith('slips.'))
        .map((k) => `${k} (value: "${getValueByPath(localeObj, k)}")`);
      nativeReviewReport[lang] = slipKeys;
    }
  }

  // Generate TRANSLATIONS_TODO.md
  const todoPath = path.join(rootDir, 'TRANSLATIONS_TODO.md');
  let mdContent = `# i18n Translation Status & Review Queue\n\n`;
  mdContent += `Generated: ${new Date().toISOString()}\n`;
  mdContent += `Baseline: English (\`en\`) with **${totalEnKeys}** total translation keys across 10 Indic locales.\n\n`;

  mdContent += `## 1. Missing Translation Keys\n\n`;
  const langsWithMissing = Object.keys(missingReport);
  if (langsWithMissing.length === 0) {
    mdContent += `✅ **All locales have 100% key coverage. Zero missing keys detected.**\n\n`;
  } else {
    for (const lang of langsWithMissing) {
      mdContent += `### Language: \`${lang}\` (${missingReport[lang].length} missing)\n`;
      for (const k of missingReport[lang]) {
        mdContent += `- [ ] \`${k}\`\n`;
      }
      mdContent += `\n`;
    }
  }

  mdContent += `## 2. Items Flagged as "Needs Native Review"\n\n`;
  mdContent += `The following newly translated slip labels are production-standard but recommended for local native speaker verification in their respective states:\n\n`;
  for (const [lang, items] of Object.entries(nativeReviewReport)) {
    mdContent += `### \`${lang.toUpperCase()}\` (Needs Native Speaker Review)\n`;
    for (const it of items) {
      mdContent += `- ⚠️ \`${it}\`\n`;
    }
    mdContent += `\n`;
  }

  try {
    fs.writeFileSync(todoPath, mdContent, 'utf-8');
    console.log(`📄 Wrote translation review report to ${path.relative(process.cwd(), todoPath)}`);
  } catch (err) {
    console.warn(`Could not write ${path.relative(process.cwd(), todoPath)}: ${(err as Error).message}`);
  }

  console.log('\n📊 Summary:');
  console.log(`Total Keys: ${totalEnKeys}`);
  console.log(`Locales Checked: ${LANGUAGES.length}`);
  if (langsWithMissing.length === 0) {
    console.log('✅ 100% Translation Coverage! Zero missing keys.');
  } else {
    console.warn(`⚠️ Missing keys found in ${langsWithMissing.join(', ')}`);
  }
  console.log(`📌 Native review flags recorded for: ${Object.keys(nativeReviewReport).join(', ')}`);
}

main();
