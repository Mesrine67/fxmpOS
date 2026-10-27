import { readFile, writeFile } from "node:fs/promises"

const versionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
const bumpTypes = new Set(["major", "minor", "patch", "prerelease"])
const args = process.argv.slice(2)
const target = (args[0] === "--" ? args[1] : args[0])?.trim()

if (!target) {
  console.error(
    "Usage: pnpm version:bump -- <major|minor|patch|prerelease|x.y.z>"
  )
  process.exit(1)
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"))
const tauriConfig = JSON.parse(
  await readFile("src-tauri/tauri.conf.json", "utf8")
)
const cargoToml = await readFile("src-tauri/Cargo.toml", "utf8")
const cargoLock = await readFile("src-tauri/Cargo.lock", "utf8")
const changelog = await readFile("CHANGELOG.md", "utf8")
const currentVersion = tauriConfig.version ?? packageJson.version
const nextVersion = bumpTypes.has(target)
  ? bump(currentVersion, target)
  : normalize(target)

if (nextVersion === currentVersion)
  throw new Error(`Version is already ${nextVersion}`)
if (changelog.includes(`## [${nextVersion}]`))
  throw new Error(`CHANGELOG.md already contains ${nextVersion}`)

packageJson.version = nextVersion
tauriConfig.version = nextVersion
const nextCargoToml = updateCargoVersion(cargoToml, "[package]", nextVersion)
const nextCargoLock = updateCargoVersion(
  cargoLock,
  'name = "fxmp-os"',
  nextVersion
)
const date = new Date().toISOString().slice(0, 10)
const heading = "# Journal des modifications"
if (!changelog.startsWith(heading))
  throw new Error("CHANGELOG.md has an unexpected format")
const nextChangelog = changelog.replace(
  heading,
  `${heading}\n\n## [${nextVersion}] - ${date}\n\n### Améliorations\n\n- À compléter avant la publication.`
)

await Promise.all([
  writeFile("package.json", `${JSON.stringify(packageJson, null, 2)}\n`),
  writeFile(
    "src-tauri/tauri.conf.json",
    `${JSON.stringify(tauriConfig, null, 2)}\n`
  ),
  writeFile("src-tauri/Cargo.toml", nextCargoToml),
  writeFile("src-tauri/Cargo.lock", nextCargoLock),
  writeFile("CHANGELOG.md", nextChangelog),
])
console.log(
  `Aligned FXMP OS version files to ${nextVersion}. Replace the changelog placeholder before publishing.`
)

function updateCargoVersion(content, section, version) {
  const lines = content.split(/\r?\n/)
  let inTarget = false
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (line === section) {
      inTarget = true
      continue
    }
    if (inTarget && line.startsWith("[")) inTarget = false
    if (inTarget && line.startsWith("version = ")) {
      lines[index] = `version = "${version}"`
      return lines.join("\n")
    }
    if (section === 'name = "fxmp-os"' && line === section) inTarget = true
    if (
      section === 'name = "fxmp-os"' &&
      inTarget &&
      line.startsWith("version = ")
    ) {
      lines[index] = `version = "${version}"`
      return lines.join("\n")
    }
  }
  throw new Error(`Could not update ${section} version`)
}

function parse(value) {
  const match = versionPattern.exec(value.replace(/^v/, ""))
  if (
    !match ||
    match.slice(1, 4).some((part) => !Number.isSafeInteger(Number(part))) ||
    match[4]?.split(".").some((part) => /^0\d+$/.test(part))
  ) {
    throw new Error(
      `Invalid version "${value}". Use semantic versioning, for example 1.2.3.`
    )
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? "",
  }
}
function normalize(value) {
  const parsed = parse(value)
  return `${parsed.major}.${parsed.minor}.${parsed.patch}${parsed.prerelease ? `-${parsed.prerelease}` : ""}`
}
function bump(value, type) {
  const parsed = parse(value)
  if (type === "major") return `${parsed.major + 1}.0.0`
  if (type === "minor") return `${parsed.major}.${parsed.minor + 1}.0`
  if (type === "patch")
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`
  const parts = parsed.prerelease ? parsed.prerelease.split(".") : ["beta", "0"]
  const last = parts.at(-1)
  if (/^\d+$/.test(last)) parts[parts.length - 1] = String(BigInt(last) + 1n)
  else parts.push("1")
  return `${parsed.major}.${parsed.minor}.${parsed.prerelease ? parsed.patch : parsed.patch + 1}-${parts.join(".")}`
}
