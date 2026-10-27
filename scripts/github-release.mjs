const githubApiOrigin = "https://api.github.com"

export async function fetchReleaseByTag({
  repository,
  tag,
  headers,
  fetchImpl = fetch,
}) {
  const releasesPath = `/repos/${repository}/releases`
  let nextPage = new URL(`${releasesPath}?per_page=100`, githubApiOrigin)
  const visitedPages = new Set()
  const matches = []
  while (nextPage) {
    if (
      nextPage.origin !== githubApiOrigin ||
      nextPage.pathname !== releasesPath
    ) {
      throw new Error("GitHub returned an invalid release pagination URL")
    }
    if (visitedPages.has(nextPage.href)) {
      throw new Error("GitHub returned a repeated release pagination URL")
    }
    visitedPages.add(nextPage.href)
    const response = await fetchImpl(nextPage, { headers })
    if (!response.ok) {
      throw new Error(
        `GitHub release list lookup failed with HTTP ${response.status}`
      )
    }
    const releases = await response.json()
    if (!Array.isArray(releases)) {
      throw new Error("GitHub did not return a release list")
    }
    matches.push(...releases.filter((release) => release.tag_name === tag))
    const nextLink = response.headers
      ?.get("link")
      ?.match(/<([^>]+)>;\s*rel="next"/i)?.[1]
    nextPage = nextLink ? new URL(nextLink) : null
  }
  if (matches.length === 0) {
    throw new Error(`GitHub release with tag ${tag} was not found`)
  }
  if (matches.length > 1) {
    throw new Error(`GitHub returned multiple releases with tag ${tag}`)
  }
  return matches[0]
}
