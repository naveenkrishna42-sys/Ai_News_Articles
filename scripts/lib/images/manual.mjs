// Manual device photo overrides. Files in assets/devices/{slug}/ always win
// over the API cascade. Returns {url,width,height,license,author,sourceUrl,provider}
// or null. Also exports searchAll() for fetching multiple photos per device (video phase).

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const DEVICES_DIR = path.join(REPO_ROOT, "assets/devices");

const BITMAP_EXT = /\.(?:jpe?g|png|webp)$/i;

// Read metadata from licence.txt if it exists in the device folder.
// First line: license name. Optional second line: author name.
async function readLicenseFile(folderPath) {
  try {
    const licenseFile = path.join(folderPath, "licence.txt");
    const content = await fs.readFile(licenseFile, "utf-8");
    const lines = content.trim().split("\n");
    return {
      license: lines[0]?.trim() || "Manually supplied",
      author: lines[1]?.trim() || "",
    };
  } catch {
    return { license: "Manually supplied", author: "" };
  }
}

// Get image files in a device folder, sorted by filename.
async function getImageFiles(folderPath) {
  try {
    const entries = await fs.readdir(folderPath);
    return entries
      .filter((f) => BITMAP_EXT.test(f))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

// Return a single image from the device folder (the first one).
export async function search(deviceSlug) {
  if (!deviceSlug) return null;
  try {
    const folderPath = path.join(DEVICES_DIR, deviceSlug);
    const stat = await fs.stat(folderPath).catch(() => null);
    if (!stat?.isDirectory()) return null;

    const files = await getImageFiles(folderPath);
    if (files.length === 0) return null;

    const { license, author } = await readLicenseFile(folderPath);
    const fileName = files[0];

    return {
      url: `/assets/devices/${deviceSlug}/${fileName}`,
      width: 0, // Metadata not available without reading the file.
      height: 0,
      license,
      author,
      sourceUrl: "",
      provider: "Manual",
    };
  } catch {
    return null;
  }
}

// Return all images from a device folder (for video phase alternation).
export async function searchAll(deviceSlug) {
  if (!deviceSlug) return [];
  try {
    const folderPath = path.join(DEVICES_DIR, deviceSlug);
    const stat = await fs.stat(folderPath).catch(() => null);
    if (!stat?.isDirectory()) return [];

    const files = await getImageFiles(folderPath);
    if (files.length === 0) return [];

    const { license, author } = await readLicenseFile(folderPath);

    return files.map((fileName) => ({
      url: `/assets/devices/${deviceSlug}/${fileName}`,
      width: 0,
      height: 0,
      license,
      author,
      sourceUrl: "",
      provider: "Manual",
    }));
  } catch {
    return [];
  }
}

export async function preflight() {
  try {
    const stat = await fs.stat(DEVICES_DIR).catch(() => null);
    return stat?.isDirectory()
      ? "Manual: OK ✅"
      : "Manual: NO FOLDER (assets/devices/ does not exist)";
  } catch (e) {
    return `Manual: FAILED (${e.message})`;
  }
}
