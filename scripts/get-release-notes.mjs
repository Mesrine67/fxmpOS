import { readFileSync } from "node:fs"

const version = process.argv[2]
if (
  !version ||
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)
) {
  throw new Error("A valid release version is required")
}

const changelog = readFileSync(
  new URL("../CHANGELOG.md", import.meta.url),
  "utf8"
)
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const heading = new RegExp(`^## \\[${escapedVersion}\\][^\\n]*$`, "m").exec(
  changelog
)
if (!heading) {
  throw new Error(`CHANGELOG.md has no notes for version ${version}`)
}
const sectionStart = heading.index + heading[0].length
const nextHeading = /^## \[/gm
nextHeading.lastIndex = sectionStart
const nextMatch = nextHeading.exec(changelog)
const notes = changelog
  .slice(sectionStart, nextMatch?.index ?? changelog.length)
  .trim()
if (!notes) throw new Error(`CHANGELOG.md has no notes for version ${version}`)
const body = [
  notes,
  "",
  "### Détails de distribution",
  `- Version FXMP OS : ${version}`,
  "- Plateforme : Windows x64 (NSIS et MSI). WebView2 est requis.",
  "- L’updater Tauri vérifie la signature Minisign avant installation et bloque les retours à une version antérieure.",
  "- La signature Authenticode de l’installateur dépend du certificat configuré dans les secrets CI.",
  "- [Journal complet des modifications](https://github.com/Mesrine67/fxmpOS/blob/main/CHANGELOG.md)",
].join("\n")
process.stdout.write(body)
