#!/usr/bin/env node
/**
 * Dumps the contents of the Electron app's localStorage (LevelDB) to stdout.
 * The app must not be running when this script is executed.
 */
const path = require("path");
const os = require("os");
const fs = require("fs");
const protobuf = require("protobufjs");
const { ClassicLevel } = require("classic-level");

const descriptorRoot = protobuf.loadSync(path.join(__dirname, "../src/proto/descriptor.proto"));
const FileDescriptorProto = descriptorRoot.lookupType("google.protobuf.FileDescriptorProto");

function decodeFileDescriptor(b64) {
  const buf = Buffer.from(b64, "base64");
  const fd = FileDescriptorProto.toObject(FileDescriptorProto.decode(buf), {
    defaults: true,
    arrays: true,
    enums: String,
  });
  return {
    name: fd.name,
    package: fd.package || null,
    dependencies: fd.dependency?.length ? fd.dependency : undefined,
    messages: fd.messageType?.map((m) => m.name).filter(Boolean),
    enums: fd.enumType?.map((e) => e.name).filter(Boolean),
    services: fd.service?.map((s) => s.name).filter(Boolean),
  };
}

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

// Replace base64 blobs (fileDescriptors) with a human-readable summary.
function redact(val) {
  if (Array.isArray(val)) return val.map(redact);
  if (val && typeof val === "object") {
    return Object.fromEntries(
      Object.entries(val).map(([k, v]) => {
        if (k === "fileDescriptors" && Array.isArray(v)) {
          return [k, v.map(decodeFileDescriptor)];
        }
        return [k, redact(v)];
      })
    );
  }
  return val;
}

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

    (byOrigin[origin] ??= {})[jsKey] = redact(parsed);
  }

  await db.close();

  if (Object.keys(byOrigin).length === 0) {
    console.log("(no entries found)");
    return;
  }

  const now = new Date();
  const datestamp = now.toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
  const collections = Object.values(byOrigin).flatMap((keys) => keys["grpcui:collections"] ?? []);
  const outDir = path.join(__dirname, "../storage-dumps");
  const outFile = path.join(outDir, `${datestamp}_${collections.length}-collections.json`);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(byOrigin, null, 2));
  console.log(`Written to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
