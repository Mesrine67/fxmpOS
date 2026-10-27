import assert from "node:assert/strict"
import test from "node:test"
import { fetchReleaseByTag } from "./github-release.mjs"

const repository = "Mesrine67/fxmpOS"
const tag = "v0.0.1"
const headers = { Accept: "application/vnd.github+json" }

function jsonResponse(payload, { link, status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(link ? { link } : {}),
    json: async () => payload,
  }
}

test("finds draft releases through GitHub's paginated release list", async () => {
  const pages = []
  const release = { id: 42, tag_name: tag, draft: true, assets: [] }
  const fetchImpl = async (url, options) => {
    assert.deepEqual(options, { headers })
    const pageUrl = new URL(url)
    pages.push(pageUrl.searchParams.get("page") ?? "1")
    if (pageUrl.searchParams.get("page") === "2") {
      return jsonResponse([release])
    }
    return jsonResponse([{ id: 1, tag_name: "v0.0.0" }], {
      link: `<https://api.github.com/repos/${repository}/releases?per_page=100&page=2>; rel="next"`,
    })
  }
  const result = await fetchReleaseByTag({
    repository,
    tag,
    headers,
    fetchImpl,
  })
  assert.equal(result, release)
  assert.deepEqual(pages, ["1", "2"])
})

test("fails when a release tag is absent", async () => {
  await assert.rejects(
    fetchReleaseByTag({
      repository,
      tag,
      headers,
      fetchImpl: async () => jsonResponse([]),
    }),
    /GitHub release with tag v0\.0\.1 was not found/
  )
})

test("rejects duplicate releases for the same tag", async () => {
  await assert.rejects(
    fetchReleaseByTag({
      repository,
      tag,
      headers,
      fetchImpl: async () =>
        jsonResponse([
          { id: 41, tag_name: tag },
          { id: 42, tag_name: tag },
        ]),
    }),
    /GitHub returned multiple releases with tag v0\.0\.1/
  )
})

test("rejects release pagination URLs outside the GitHub API", async () => {
  await assert.rejects(
    fetchReleaseByTag({
      repository,
      tag,
      headers,
      fetchImpl: async () =>
        jsonResponse([], {
          link: '<https://example.com/releases?page=2>; rel="next"',
        }),
    }),
    /invalid release pagination URL/
  )
})
