import { createHash } from "node:crypto"
import {
  createWriteStream,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { Readable, Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import path from "node:path"
import process from "node:process"
import { spawnSync } from "node:child_process"
import { fetchReleaseByTag } from "./github-release.mjs"
import { resolveUpdaterAsset } from "./updater-release-url.mjs"

const [expectedVersion] = process.argv.slice(2)
const repository = "Mesrine67/fxmpOS"
const assetDirectory = "release-assets"
const manifestPath = path.join(assetDirectory, "latest.json")
const checksumPath = path.join(assetDirectory, "SHA256SUMS.txt")
const maxAssetSize = 2 * 1024 ** 3

if (
  !expectedVersion ||
  !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
    expectedVersion
  )
) {
  throw new Error(
    "Usage: node scripts/verify-updater-release.mjs <expected-semver>"
  )
}

if (process.env.GITHUB_REPOSITORY !== repository) {
  throw new Error(
    `This verifier only accepts release assets from ${repository}`
  )
}

const githubToken = process.env.GH_TOKEN
if (!githubToken)
  throw new Error("GH_TOKEN must be set to verify release assets")

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
if (manifest.version !== expectedVersion) {
  throw new Error(
    `latest.json version ${manifest.version ?? "<missing>"} does not match ${expectedVersion}`
  )
}

const platforms = Object.entries(manifest.platforms ?? {})
if (platforms.length === 0) {
  throw new Error("latest.json contains no updater platforms")
}

const requiredPlatformTargets = [
  "windows-x86_64",
  "darwin-aarch64",
  "darwin-x86_64",
  "linux-x86_64",
]
const platformNames = platforms.map(([platform]) => platform)
for (const target of requiredPlatformTargets) {
  if (
    !platformNames.some(
      (platform) => platform === target || platform.startsWith(`${target}-`)
    )
  ) {
    throw new Error(`latest.json is missing an updater entry for ${target}`)
  }
}

const config = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"))
const publicKeyDocument = Buffer.from(config.plugins.updater.pubkey, "base64")
  .toString("utf8")
  .trim()
const publicKey = publicKeyDocument.split(/\r?\n/).at(-1)
if (!publicKey?.startsWith("RW")) {
  throw new Error(
    "Could not extract the Minisign public key from tauri.conf.json"
  )
}

const apiHeaders = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${githubToken}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "fxmpOS-updater-release-verifier",
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
for (const asset of release.assets) {
  if (
    typeof asset.name !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9 _().+-]{0,254}$/.test(asset.name) ||
    !Number.isSafeInteger(asset.id) ||
    !Number.isSafeInteger(asset.size) ||
    asset.size < 0 ||
    asset.size > maxAssetSize ||
    releaseAssets.has(asset.name)
  ) {
    throw new Error(
      "The GitHub release contains invalid or duplicate asset metadata"
    )
  }
  releaseAssets.set(asset.name, asset)
}
if (!releaseAssets.has("latest.json")) {
  throw new Error("The draft release does not contain latest.json")
}

const verificationDirectory = mkdtempSync(
  path.join(tmpdir(), "fxmp-updater-signature-")
)

async function downloadAsset(asset, destination) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/releases/assets/${asset.id}`,
    {
      headers: {
        ...apiHeaders,
        Accept: "application/octet-stream",
      },
    }
  )
  if (!response.ok || !response.body) {
    throw new Error(
      `Could not download release asset ${asset.name} (HTTP ${response.status})`
    )
  }

  const finalUrl = new URL(response.url)
  if (
    finalUrl.protocol !== "https:" ||
    ![
      "api.github.com",
      "release-assets.githubusercontent.com",
      "objects.githubusercontent.com",
    ].includes(finalUrl.hostname)
  ) {
    throw new Error(`GitHub redirected ${asset.name} to an unexpected host`)
  }

  let byteCount = 0
  const hash = createHash("sha256")
  const hasher = new Transform({
    transform(chunk, _encoding, callback) {
      byteCount += chunk.length
      if (byteCount > asset.size || byteCount > maxAssetSize) {
        callback(
          new Error(`Release asset ${asset.name} exceeded its declared size`)
        )
        return
      }
      hash.update(chunk)
      callback(null, chunk)
    },
  })

  await pipeline(
    Readable.fromWeb(response.body),
    hasher,
    createWriteStream(destination, { flags: "w" })
  )
  if (byteCount !== asset.size) {
    throw new Error(`Release asset ${asset.name} has an unexpected size`)
  }
  return hash.digest("hex")
}

function assertSignedVersion(signatureText, assetName) {
  const trustedLine = signatureText
    .split(/\r?\n/)
    .find((line) => line.startsWith("trusted comment: "))
  const trustedComment = trustedLine?.slice("trusted comment: ".length)
  const signedVersion = trustedComment
    ?.split("\t")
    .find((field) => field.startsWith("version:"))
    ?.slice("version:".length)

  if (signedVersion !== expectedVersion) {
    throw new Error(
      `Updater signature for ${assetName} is bound to ${signedVersion ?? "no version"}, expected ${expectedVersion}`
    )
  }
}

const verifiedDigests = new Map()
try {
  for (const [platform, update] of platforms) {
    if (typeof update.signature !== "string" || !update.signature.trim()) {
      throw new Error(`Updater entry ${platform} has no signature`)
    }

    const asset = resolveUpdaterAsset(update.url, platform, {
      expectedVersion,
      repository,
      releaseAssets,
    })
    const assetName = asset.name
    const sidecar = releaseAssets.get(`${assetName}.sig`)
    if (!asset || !sidecar) {
      throw new Error(`The release is missing ${assetName} or its .sig asset`)
    }

    const bundlePath = path.join(verificationDirectory, "bundle.bin")
    const sidecarPath = path.join(verificationDirectory, "sidecar.txt")
    const signaturePath = path.join(verificationDirectory, "bundle.minisig")
    const digest = await downloadAsset(asset, bundlePath)
    verifiedDigests.set(assetName, digest)
    await downloadAsset(sidecar, sidecarPath)

    const sidecarSignature = readFileSync(sidecarPath, "utf8").trim()
    const manifestSignature = update.signature.trim()
    if (sidecarSignature !== manifestSignature) {
      throw new Error(
        `The manifest signature for ${assetName} differs from its .sig asset`
      )
    }

    const decodedSignature = Buffer.from(manifestSignature, "base64")
    const decodedSignatureText = decodedSignature.toString("utf8")
    if (
      !decodedSignature.length ||
      decodedSignature.toString("base64") !== manifestSignature ||
      !decodedSignatureText.startsWith("untrusted comment:") ||
      !decodedSignatureText.includes("\ntrusted comment: ")
    ) {
      throw new Error(
        `Updater signature for ${assetName} is not valid Tauri Base64`
      )
    }

    writeFileSync(signaturePath, decodedSignature)

    const verification = spawnSync(
      "minisign",
      ["-V", "-m", bundlePath, "-x", signaturePath, "-P", publicKey],
      { encoding: "utf8" }
    )
    if (verification.error) throw verification.error
    if (verification.status !== 0) {
      throw new Error(
        `Minisign verification failed for ${platform} (${assetName}): ${verification.stderr || verification.stdout}`
      )
    }

    assertSignedVersion(decodedSignatureText, assetName)
    console.log(`Verified ${platform}: ${assetName}`)
  }

  const checksums = []
  for (const asset of releaseAssets.values()) {
    if (
      asset.name === "latest.json" ||
      asset.name === "SHA256SUMS.txt" ||
      asset.name.endsWith(".sig")
    ) {
      continue
    }

    const digest =
      verifiedDigests.get(asset.name) ??
      (await downloadAsset(
        asset,
        path.join(verificationDirectory, "checksum.bin")
      ))
    checksums.push(`${digest}  ${asset.name}`)
  }

  if (checksums.length === 0) {
    throw new Error("No installer or bundle assets were found")
  }

  checksums.sort((left, right) => left.localeCompare(right))
  writeFileSync(checksumPath, `${checksums.join("\n")}\n`)
  console.log(`Wrote SHA256SUMS.txt for ${checksums.length} release assets`)
} finally {
  rmSync(verificationDirectory, { recursive: true, force: true })
}
