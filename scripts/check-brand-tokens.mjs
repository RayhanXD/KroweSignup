#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "app");
const VALID_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

const disallowedUtilityRe = new RegExp(
  `\\b(?:text|bg|border|ring|from|to|via|caret|placeholder|accent)-(?:${PALETTE})-[0-9]{2,3}(?:\\/[0-9]{1,3})?\\b`,
  "g"
);
const disallowedBlackWhiteRe = /\b(?:text|bg|border)-(?:black|white)(?:\/[0-9]{1,3})?\b/g;
const hexColorRe = /#[0-9a-fA-F]{3,8}\b/g;

const skipFile = (filePath) => {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.includes(".test.") || normalized.includes("/__tests__/");
};

function walk(dir, acc = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, acc);
      continue;
    }
    if (!VALID_EXT.has(extname(full))) continue;
    if (skipFile(full)) continue;
    acc.push(full);
  }
  return acc;
}

function lineFromIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

const violations = [];

for (const file of walk(APP_DIR)) {
  const src = readFileSync(file, "utf8");

  for (const re of [disallowedUtilityRe, disallowedBlackWhiteRe, hexColorRe]) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(src)) !== null) {
      violations.push({
        file: file.replace(`${ROOT}/`, ""),
        line: lineFromIndex(src, match.index),
        token: match[0],
      });
    }
  }
}

if (violations.length > 0) {
  console.error("Brand token check failed. Replace hardcoded palette/hex usage with semantic tokens.");
  for (const violation of violations.slice(0, 200)) {
    console.error(`- ${violation.file}:${violation.line} -> ${violation.token}`);
  }
  if (violations.length > 200) {
    console.error(`...and ${violations.length - 200} more violations.`);
  }
  process.exit(1);
}

console.log("Brand token check passed.");
