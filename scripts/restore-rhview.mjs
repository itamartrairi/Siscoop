#!/usr/bin/env node
/**
 * Restaura src/views/RhView.tsx a partir do commit estavel 4918524.
 * Uso: node scripts/restore-rhview.mjs
 * Depois: git add src/views/RhView.tsx && git commit -m "fix: restaura RhView" && git push
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = 'https://raw.githubusercontent.com/itamartrairi/Siscoop/4918524e16f67fd19be5582782b259aeeb8e01e2/src/views/RhView.tsx';

const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const text = await res.text();
const dest = join(__dirname, '..', 'src', 'views', 'RhView.tsx');
writeFileSync(dest, text, 'utf8');
console.log(`Restaurado ${text.length} chars em ${dest}`);
