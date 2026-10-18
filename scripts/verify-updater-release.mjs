import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import process from "node:process"

const [assetDirectory, expectedVersion] = process.argv.slice(2)

if (!assetDirectory || !expectedVersion) {
  throw new Error(
    "Usage: node scripts/verify-updater-release.mjs <release-assets-dir> <expected-version>"
  )
}

const manifestPath = path.join(assetDirectory, "latest.json")
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

const verificationDirectory = mkdtempSync(
  path.join(tmpdir(), "fxmp-updater-signature-")
)

try {
  for (const [platform, update] of platforms) {
    if (
      typeof update.url !== "string" ||
      typeof update.signature !== "string"
    ) {
      throw new Error(`Updater entry ${platform} has no URL or signature`)
    }

    const updateUrl = new URL(update.url)
    const expectedPath = `/${process.env.GITHUB_REPOSITORY ?? "Mesrine67/fxmpOS"}/releases/download/v${expectedVersion}/`
    if (
      updateUrl.protocol !== "https:" ||
      updateUrl.hostname !== "github.com" ||
      updateUrl.port !== "" ||
      updateUrl.username !== "" ||
      updateUrl.password !== "" ||
      updateUrl.search !== "" ||
      updateUrl.hash !== "" ||
      !updateUrl.pathname.startsWith(expectedPath)
    ) {
      throw new Error(
        `Updater entry ${platform} points outside the expected GitHub release`
      )
    }

    const encodedAssetName = updateUrl.pathname.slice(expectedPath.length)
    if (!encodedAssetName || encodedAssetName.includes("/")) {
      throw new Error(
        `Updater entry ${platform} does not point to a single release asset`
      )
    }

    const assetName = decodeURIComponent(encodedAssetName)
    if (
      !assetName ||
      assetName === "." ||
      assetName === ".." ||
      /[\\/:]/.test(assetName)
    ) {
      throw new Error(
        `Updater entry ${platform} contains an invalid asset name`
      )
    }

    const assetRoot = path.resolve(assetDirectory)
    const assetPath = path.resolve(assetRoot, assetName)
    if (path.dirname(assetPath) !== assetRoot) {
      throw new Error(
        `Updater entry ${platform} escapes the downloaded release directory`
      )
    }
    const signaturePath = `${assetPath}.sig`
    const signature = update.signature.trim()

    if (!signature) {
      throw new Error(`Updater entry ${platform} has an empty signature`)
    }

    const sidecarSignature = readFileSync(signaturePath, "utf8").trim()
    if (sidecarSignature !== signature) {
      throw new Error(
        `The manifest signature for ${assetName} differs from its .sig asset`
      )
    }

    const decodedSignature = Buffer.from(signature, "base64")
    const decodedSignatureText = decodedSignature.toString("utf8")
    if (
      !decodedSignature.length ||
      decodedSignature.toString("base64") !== signature ||
      !decodedSignatureText.startsWith("untrusted comment:") ||
      !decodedSignatureText.includes("\ntrusted comment: ")
    ) {
      throw new Error(
        `Updater signature for ${assetName} is not valid Tauri Base64`
      )
    }

    const decodedSignaturePath = path.join(verificationDirectory, "bundle.sig")
    writeFileSync(decodedSignaturePath, decodedSignature)

    const verification = spawnSync(
      "minisign",
      ["-V", "-m", assetPath, "-x", decodedSignaturePath, "-P", publicKey],
      { encoding: "utf8" }
    )
    if (verification.error) throw verification.error
    if (verification.status !== 0) {
      throw new Error(
        `Minisign verification failed for ${platform} (${assetName}): ${verification.stderr || verification.stdout}`
      )
    }

    console.log(`Verified ${platform}: ${assetName}`)
  }
} finally {
  rmSync(verificationDirectory, { recursive: true, force: true })
}

const excludedAssets = new Set(["latest.json", "SHA256SUMS.txt"])
const releaseAssets = readdirSync(assetDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => !excludedAssets.has(name) && !name.endsWith(".sig"))
  .sort((left, right) => left.localeCompare(right))

if (releaseAssets.length === 0) {
  throw new Error("No installer or bundle assets were downloaded")
}

const checksums = releaseAssets.map((assetName) => {
  const digest = createHash("sha256")
    .update(readFileSync(path.join(assetDirectory, assetName)))
    .digest("hex")
  return `${digest}  ${assetName}`
})

writeFileSync(
  path.join(assetDirectory, "SHA256SUMS.txt"),
  `${checksums.join("\n")}\n`
)
console.log(`Wrote SHA256SUMS.txt for ${releaseAssets.length} release assets`)
