import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// Adresář pro nahrané soubory. Lokálně ./uploads, na Railway např. /data/uploads (volume).
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

function safeSegment(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Uloží soubor a vrátí "klíč" (relativní cestu), který se ukládá do DB.
export async function saveFile(file: File, subdir: string): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = safeSegment(path.extname(file.name) || "");
  const key = path.posix.join(safeSegment(subdir), crypto.randomUUID() + ext);
  const fullPath = path.join(UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, bytes);
  return key;
}

// Načte soubor podle klíče (pro servírování přes API). Vrací null, když neexistuje.
export async function readFile(key: string): Promise<Buffer | null> {
  const cleanKey = path.posix.normalize(key).replace(/^(\.\.(\/|$))+/, "");
  const fullPath = path.join(UPLOAD_DIR, cleanKey);
  // ochrana proti path traversal
  if (!path.resolve(fullPath).startsWith(path.resolve(UPLOAD_DIR))) return null;
  try {
    return await fs.readFile(fullPath);
  } catch {
    return null;
  }
}

export function contentTypeFor(key: string): string {
  const ext = path.extname(key).toLowerCase();
  if (ext === ".gpx") return "application/gpx+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}
