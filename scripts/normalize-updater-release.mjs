import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import process from "node:process"

import { fetchReleaseByTag } from "./github-release.mjs"
import { normalizeUpdaterAssetUrls } from "./updater-release-url.mjs"

const [expectedVersion] = process.argv.slice(2)
const repository = "Mesrine67/fxmpOS"
const manifestPath = path.join("release-assets", "latest.json")
const assetNamePattern = /^[A-Za-z0-9][A-Za-z0-9 _().+-]{0,254}$/

if (
  !expectedVersion ||
  !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
    expectedVersion
  )
) {
  throw new Error(
    "Usage: node scripts/normalize-updater-release.mjs <expected-semver>"
  )
}

if (process.env.GITHUB_REPOSITORY !== repository) {
  throw new Error(`This normalizer only accepts releases from ${repository}`)
}

const githubToken = process.env.GH_TOKEN
if (!githubToken)
  throw new Error("GH_TOKEN must be set to normalize release URLs")

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
if (manifest.version !== expectedVersion) {
  throw new Error(
    `latest.json version ${manifest.version ?? "<missing>"} does not match ${expectedVersion}`
  )
}

const apiHeaders = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${githubToken}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "fxmpOS-updater-release-normalizer",
}
const release = await fetchReleaseByTag({
  repository,
  tag: `v${expectedVersion}`,
  headers: apiHeaders,
})
if (release.tag_name !== `v${expectedVersion}` || release.draft !== true) {
  throw new Error(
    "The release tag or draft state does not match the validated source"
  )
}
if (!Array.isArray(release.assets)) {
  throw new Error("GitHub did not return a release asset list")
}

const releaseAssets = new Map()
const releaseAssetsById = new Map()
for (const asset of release.assets) {
  if (
    typeof asset.name !== "string" ||
    !assetNamePattern.test(asset.name) ||
    !Number.isSafeInteger(asset.id) ||
    typeof asset.browser_download_url !== "string" ||
    releaseAssets.has(asset.name) ||
    releaseAssetsById.has(String(asset.id))
  ) {
    throw new Error(
      "The GitHub release contains invalid or duplicate asset metadata"
    )
  }
  releaseAssets.set(asset.name, asset)
  releaseAssetsById.set(String(asset.id), asset)
}

const normalizedCount = normalizeUpdaterAssetUrls(manifest, {
  expectedVersion,
  repository,
  releaseAssets,
  releaseAssetsById,
})
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  `Normalized ${normalizedCount} updater URL(s) to browser-download URLs for ${release.tag_name}`
)
