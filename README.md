# gRPC UI

[![Release](https://img.shields.io/github/v/release/ministrudels/grpc-ui)](https://github.com/ministrudels/grpc-ui/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/ministrudels/grpc-ui/ci.yml?branch=main&label=CI)](https://github.com/ministrudels/grpc-ui/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/ministrudels/grpc-ui)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)](#installation)

A desktop gRPC client — built for developers who want Postman-level ergonomics for gRPC. No proto files, no config files, no plugins. Point it at a server and start sending requests.

Built with Electron, React, and TypeScript.

<!-- TODO: Add screenshot or demo GIF here -->

## Zero-config schema discovery

Point gRPC UI at any server with reflection enabled and it instantly discovers every service, method, and message type — no proto files, no manual imports. Reflection v1 and v1alpha are both supported with automatic fallback, so it works across all major frameworks (grpc-go, grpc-java, grpc-node, tonic, etc.).

---

## Installation

### macOS (Homebrew — recommended)

```sh
brew tap ministrudels/tap
brew install --cask grpc-ui
```

No Gatekeeper warnings, auto-updates with `brew upgrade`.

### macOS (direct download)

Download `gRPC-UI-<version>-arm64.dmg` (Apple Silicon) or `gRPC-UI-<version>-mac.dmg` (Intel) from the [latest release](https://github.com/ministrudels/grpc-ui/releases/latest).

> **First launch:** right-click the app → **Open** → **Open** to approve it once. macOS will not ask again.

### Windows

Download `gRPC-UI-Setup-<version>.exe` from the [latest release](https://github.com/ministrudels/grpc-ui/releases/latest) and run the installer.

### Linux

**AppImage** (universal):
```sh
chmod +x gRPC-UI-<version>.AppImage
./gRPC-UI-<version>.AppImage
```

**Debian / Ubuntu:**
```sh
sudo dpkg -i grpc-ui_<version>_amd64.deb
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
