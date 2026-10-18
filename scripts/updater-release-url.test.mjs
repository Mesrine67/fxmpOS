import assert from "node:assert/strict"
import test from "node:test"

import {
  normalizeUpdaterAssetUrls,
  resolveUpdaterAsset,
} from "./updater-release-url.mjs"

const repository = "Mesrine67/fxmpOS"
const asset = {
  id: 12345,
  name: "fxmp-os_0.0.1_x64-setup.exe",
  browser_download_url: `https://github.com/${repository}/releases/download/v0.0.1/fxmp-os_0.0.1_x64-setup.exe`,
}
const releaseAssets = new Map([[asset.name, asset]])
const releaseAssetsById = new Map([[String(asset.id), asset]])
const context = {
  expectedVersion: "0.0.1",
  repository,
  releaseAssets,
  releaseAssetsById,
}

test("rejects REST asset URLs because the Tauri updater cannot download them directly", () => {
  assert.throws(
    () =>
      resolveUpdaterAsset(
        `https://api.github.com/repos/${repository}/releases/assets/${asset.id}`,
        "windows-x86_64",
        context
      ),
    /points outside the expected GitHub release/
  )
})

test("accepts a tagged GitHub download URL for an asset in the release", () => {
  const resolved = resolveUpdaterAsset(
    `https://github.com/${repository}/releases/download/v0.0.1/${encodeURIComponent(asset.name)}`,
    "windows-x86_64",
    context
  )

  assert.equal(resolved, asset)
})

test("rewrites tauri-action REST asset URLs to public browser download URLs", () => {
  const manifest = {
    version: "0.0.1",
    platforms: {
      "windows-x86_64": {
        url: `https://api.github.com/repos/${repository}/releases/assets/${asset.id}`,
        signature: "signature",
      },
    },
  }

  assert.equal(normalizeUpdaterAssetUrls(manifest, context), 1)
  assert.equal(
    manifest.platforms["windows-x86_64"].url,
    asset.browser_download_url
  )
})

test("rejects an API asset URL that does not belong to the expected release", () => {
  const manifest = {
    platforms: {
      "windows-x86_64": {
        url: `https://api.github.com/repos/${repository}/releases/assets/12346`,
      },
    },
  }

  assert.throws(() => normalizeUpdaterAssetUrls(manifest, context))
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
