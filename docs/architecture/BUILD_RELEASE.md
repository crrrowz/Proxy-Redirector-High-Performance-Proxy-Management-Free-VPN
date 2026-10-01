# 📦 Build, Packaging & Release Guide

---

## 1. Automated Release Automation

The build system compiles multi-platform release artifacts:

```powershell
# Run the root build automation script:
.\scripts\build_all.ps1 -Release

# Outputs:
# 1. Engine Daemon:   engine\build\engine.exe
# 2. Headless CLI:    client\build\proxy-cli.exe
# 3. Wails GUI:       client\build\bin\ProxyRedirector.exe
```

---

## 2. Release Checklist

1. Verify all unit tests pass with race detection: `go test -race ./...` and `npm test`.
2. Ensure `CHANGELOG.md` reflects all new features, bug fixes, and security patches.
3. Tag the release commit using Semantic Versioning (e.g. `git tag -a v3.0.0 -m "Release v3.0.0"`).
4. Build release binaries and upload artifacts to GitHub Releases.
