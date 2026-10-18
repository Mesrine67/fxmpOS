import assert from "node:assert/strict"
import test from "node:test"

import { resolveUpdaterAsset } from "./updater-release-url.mjs"

const repository = "Mesrine67/fxmpOS"
const asset = { id: 12345, name: "fxmp-os_0.0.1_x64-setup.exe" }
const releaseAssets = new Map([[asset.name, asset]])
const releaseAssetsById = new Map([[String(asset.id), asset]])
const context = {
  expectedVersion: "0.0.1",
  repository,
  releaseAssets,
  releaseAssetsById,
}

test("accepts the REST asset URL emitted by tauri-action when it belongs to the release", () => {
  const resolved = resolveUpdaterAsset(
    `https://api.github.com/repos/${repository}/releases/assets/${asset.id}`,
    "windows-x86_64",
    context
  )

  assert.equal(resolved, asset)
})

test("accepts a tagged GitHub download URL for an asset in the release", () => {
  const resolved = resolveUpdaterAsset(
    `https://github.com/${repository}/releases/download/v0.0.1/${encodeURIComponent(asset.name)}`,
    "windows-x86_64",
    context
  )

  assert.equal(resolved, asset)
})

test("rejects REST asset IDs that are not part of the expected release", () => {
  assert.throws(
    () =>
      resolveUpdaterAsset(
        `https://api.github.com/repos/${repository}/releases/assets/12346`,
        "windows-x86_64",
        context
      ),
    /does not reference an asset in the expected release/
  )
})

test("rejects URLs outside the expected repository, release, and asset", () => {
  for (const url of [
    "https://api.github.com/repos/attacker/other/releases/assets/12345",
    "https://github.com/attacker/other/releases/download/v0.0.1/file.exe",
    "https://github.com/Mesrine67/fxmpOS/releases/download/v0.0.2/file.exe",
    `https://api.github.com/repos/${repository}/releases/assets/${asset.id}?redirect=1`,
    `https://evil.example/${repository}/releases/download/v0.0.1/${asset.name}`,
  ]) {
    assert.throws(() => resolveUpdaterAsset(url, "windows-x86_64", context))
  }
})
