import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import process from "node:process"

const packageVersion = JSON.parse(readFileSync("package.json", "utf8")).version
const tauriVersion = JSON.parse(
  readFileSync("src-tauri/tauri.conf.json", "utf8")
).version
const cargoToml = readFileSync("src-tauri/Cargo.toml", "utf8")
const cargoVersion = cargoToml.match(/^\s*version\s*=\s*"([^"]+)"/m)?.[1]

function resolveCommit(ref, description) {
  const result = spawnSync(
    "git",
    ["rev-parse", "--verify", `${ref}^{commit}`],
    { encoding: "utf8" }
  )
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${description} does not resolve to a Git commit.`)
  }
  return result.stdout.trim()
}

function assertCommitOnDefaultBranch(commit, defaultBranch) {
  const defaultBranchRef = `refs/remotes/origin/${defaultBranch}`
  resolveCommit(defaultBranchRef, `Default branch ${defaultBranch}`)
  const ancestry = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", commit, defaultBranchRef],
    { encoding: "utf8" }
  )
  if (ancestry.error) throw ancestry.error
  if (ancestry.status !== 0) {
    throw new Error(
      `Release tag commit ${commit} must be reachable from the current ${defaultBranch} history.`
    )
  }
}

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
  const defaultBranch = process.env.DEFAULT_BRANCH
  if (!defaultBranch) {
    throw new Error("DEFAULT_BRANCH must be set to validate a release tag.")
  }
  const taggedCommit = resolveCommit("HEAD", "Checked-out release source")
  assertCommitOnDefaultBranch(taggedCommit, defaultBranch)
} else if (eventName === "workflow_dispatch") {
  const defaultBranch = process.env.DEFAULT_BRANCH
  if (!defaultBranch || ref !== `refs/heads/${defaultBranch}`) {
    throw new Error(
      `Manual release verification must run from the repository default branch (${defaultBranch ?? "<missing>"}).`
    )
  }
  const draftTag = `v${tauriVersion}`
  const draftTagCommit = resolveCommit(
    `refs/tags/${draftTag}`,
    `Draft release tag ${draftTag}`
  )
  assertCommitOnDefaultBranch(draftTagCommit, defaultBranch)
} else if (eventName) {
  throw new Error(`Unsupported release event: ${eventName}`)
}

process.stdout.write(`${tauriVersion}\n`)
