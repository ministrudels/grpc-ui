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

// Chromium localStorage LevelDB format (shared-db layout):
//   key:   "_<origin>\x00\x01<localStorage_key>"  (UTF-8)
//   value: "\x01<value>"                           (UTF-8, 1-byte version prefix)
// META/VERSION/METAACCESS entries are skipped.

async function main() {
  const db = new ClassicLevel(dbPath, { keyEncoding: "buffer", valueEncoding: "buffer" });

  try {
    await db.open();
  } catch (err) {
    console.error(`Failed to open LevelDB at:\n  ${dbPath}\n`);
    console.error("Make sure the app is not running.");
    process.exit(1);
  }

  // Group entries by origin for readability
  const byOrigin = {};

  for await (const [keyBuf, valBuf] of db.iterator()) {
    const keyStr = keyBuf.toString("utf8");

    // Data keys start with "_", meta keys start with "META" or "VERSION"
    if (!keyStr.startsWith("_")) continue;

    // Format: _<origin>\x00\x01<jsKey>
    const nullIdx = keyStr.indexOf("\x00\x01");
    if (nullIdx === -1) continue;

    const origin = keyStr.slice(1, nullIdx);
    const jsKey = keyStr.slice(nullIdx + 2);

    // Strip the 1-byte version prefix from the value
    const rawVal = valBuf.length > 1 ? valBuf.slice(1).toString("utf8") : "";

    let parsed;
    try {
      parsed = JSON.parse(rawVal);
    } catch {
      parsed = rawVal;
    }

    (byOrigin[origin] ??= {})[jsKey] = parsed;
  }

  await db.close();

  if (Object.keys(byOrigin).length === 0) {
    console.log("(no entries found)");
    return;
  }

  for (const [origin, keys] of Object.entries(byOrigin)) {
    console.log(`\n${"═".repeat(64)}`);
    console.log(`  ${origin}`);
    console.log(`${"═".repeat(64)}`);
    for (const [key, value] of Object.entries(keys)) {
      console.log(`\n  ── ${key}`);
      console.log(typeof value === "string" ? `  ${value}` : JSON.stringify(value, null, 2).replace(/^/gm, "  "));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
