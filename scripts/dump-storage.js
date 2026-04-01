#!/usr/bin/env node
/**
 * Dumps the contents of the Electron app's localStorage (LevelDB) to stdout.
 * The app must not be running when this script is executed.
 */
const path = require("path");
const os = require("os");
const { ClassicLevel } = require("classic-level");

const userDataPaths = {
  darwin: path.join(os.homedir(), "Library", "Application Support", "grpc-ui"),
  win32: path.join(process.env.APPDATA ?? "", "grpc-ui"),
  linux: path.join(os.homedir(), ".config", "grpc-ui"),
};

const userData = userDataPaths[process.platform];
if (!userData) {
  console.error(`Unsupported platform: ${process.platform}`);
  process.exit(1);
}

const dbPath = path.join(userData, "Local Storage", "leveldb");

// Chromium stores localStorage keys/values as UTF-16 LE.
// Values have a 1-byte version prefix (0x01) that must be stripped.
function decodeUtf16(buf) {
  return new TextDecoder("utf-16le").decode(buf);
}

async function main() {
  const db = new ClassicLevel(dbPath, { keyEncoding: "buffer", valueEncoding: "buffer" });

  try {
    await db.open();
  } catch (err) {
    console.error(`Failed to open LevelDB at:\n  ${dbPath}\n`);
    console.error("Make sure the app is not running.");
    process.exit(1);
  }

  const entries = {};

  for await (const [keyBuf, valBuf] of db.iterator()) {
    try {
      const key = decodeUtf16(keyBuf).replace(/\0/g, "").trim();
      if (!key) continue;

      // Strip the 1-byte version prefix on the value
      const rawVal = valBuf.length > 1 ? valBuf.slice(1) : valBuf;
      const val = decodeUtf16(rawVal);

      try {
        entries[key] = JSON.parse(val);
      } catch {
        entries[key] = val;
      }
    } catch {
      // skip non-text entries
    }
  }

  await db.close();

  if (Object.keys(entries).length === 0) {
    console.log("(no entries found)");
    return;
  }

  for (const [key, value] of Object.entries(entries)) {
    console.log(`\n── ${key} ${"─".repeat(Math.max(0, 60 - key.length))}`);
    console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
