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

run("cmake", ["-S", source, "-B", build, "-G", "Visual Studio 17 2022", "-A", "x64"])
run("cmake", ["--build", build, "--config", "Release", "--target", "doludock"])
