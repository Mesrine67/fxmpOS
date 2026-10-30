import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = path.join(repoRoot, "src-tauri", "third-party", "doludock")
const build = path.join(source, "build")

if (process.platform !== "win32") {
  console.log("Skipping DoluDock's Windows native build on this platform.")
  process.exit(0)
}

function run(program, args) {
  const result = spawnSync(program, args, { cwd: repoRoot, stdio: "inherit", shell: false })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const vswhere = path.join(
  process.env["ProgramFiles(x86)"],
  "Microsoft Visual Studio",
  "Installer",
  "vswhere.exe",
)
const detected = spawnSync(
  vswhere,
  ["-latest", "-products", "*", "-property", "installationVersion"],
  { cwd: repoRoot, encoding: "utf8", shell: false },
)
if (detected.error || detected.status !== 0) {
  throw new Error("Could not locate the installed Visual Studio C++ toolchain.")
}

const major = Number.parseInt(detected.stdout.trim().split(".")[0], 10)
const year = new Map([[18, "2026"], [17, "2022"], [16, "2019"]]).get(major)
if (!year) throw new Error(`Unsupported Visual Studio version: ${detected.stdout.trim()}`)

run("cmake", ["-S", source, "-B", build, "-G", `Visual Studio ${major} ${year}`, "-A", "x64"])
run("cmake", ["--build", build, "--config", "Release", "--target", "doludock"])
