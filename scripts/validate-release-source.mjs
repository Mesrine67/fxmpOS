import { readFileSync } from "node:fs"
import process from "node:process"

const packageVersion = JSON.parse(readFileSync("package.json", "utf8")).version
const tauriVersion = JSON.parse(
  readFileSync("src-tauri/tauri.conf.json", "utf8")
).version
const cargoToml = readFileSync("src-tauri/Cargo.toml", "utf8")
const cargoVersion = cargoToml.match(/^\s*version\s*=\s*"([^"]+)"/m)?.[1]

if (
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(tauriVersion)
) {
  throw new Error(
    `Invalid Tauri application version: ${tauriVersion ?? "missing"}`
  )
}

if (packageVersion !== tauriVersion || cargoVersion !== tauriVersion) {
  throw new Error(
    `Version mismatch: package.json=${packageVersion ?? "missing"}, tauri.conf.json=${tauriVersion}, Cargo.toml=${cargoVersion ?? "missing"}`
  )
}

const eventName = process.env.GITHUB_EVENT_NAME
const ref = process.env.GITHUB_REF
if (eventName === "push") {
  if (
    process.env.GITHUB_REF_TYPE !== "tag" ||
    process.env.GITHUB_REF_NAME !== `v${tauriVersion}`
  ) {
    throw new Error(
      `Release tag ${process.env.GITHUB_REF_NAME ?? "<missing>"} must match the configured version v${tauriVersion}.`
    )
  }
} else if (eventName === "workflow_dispatch") {
  const defaultBranch = process.env.DEFAULT_BRANCH
  if (!defaultBranch || ref !== `refs/heads/${defaultBranch}`) {
    throw new Error(
      `Manual release verification must run from the repository default branch (${defaultBranch ?? "<missing>"}).`
    )
  }
} else if (eventName) {
  throw new Error(`Unsupported release event: ${eventName}`)
}

process.stdout.write(`${tauriVersion}\n`)
