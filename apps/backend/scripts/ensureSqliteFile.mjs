import fs from 'node:fs';
import path from 'node:path';

const url = process.env.DATABASE_URL || '';
const match = url.match(/^file:(.+)$/);

if (!match) {
  process.exit(0);
}

let filePath = match[1];

// If it's a relative path, resolve from the backend package root.
if (filePath.startsWith('./') || filePath.startsWith('.\\') || (!path.isAbsolute(filePath) && !/^[A-Za-z]:\//.test(filePath))) {
  filePath = path.resolve(process.cwd(), filePath.replace(/^file:/, ''));
}

const dir = path.dirname(filePath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

if (!fs.existsSync(filePath)) {
  fs.closeSync(fs.openSync(filePath, 'w'));
}

