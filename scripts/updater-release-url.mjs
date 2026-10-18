const assetNamePattern = /^[A-Za-z0-9][A-Za-z0-9 _().+-]{0,254}$/

export function resolveUpdaterAsset(
  value,
  platform,
  { expectedVersion, repository, releaseAssets }
) {
  if (typeof value !== "string") {
    throw new Error(`Updater entry ${platform} has no URL`)
  }

  let updateUrl
  try {
    updateUrl = new URL(value)
  } catch {
    throw new Error(`Updater entry ${platform} has an invalid URL`)
  }

  if (
    updateUrl.protocol !== "https:" ||
    updateUrl.port !== "" ||
    updateUrl.username !== "" ||
    updateUrl.password !== "" ||
    updateUrl.search !== "" ||
    updateUrl.hash !== ""
  ) {
    throw new Error(
      `Updater entry ${platform} points outside the expected GitHub release`
    )
  }

  const expectedPath = `/${repository}/releases/download/v${expectedVersion}/`
  if (
    updateUrl.hostname !== "github.com" ||
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

  let assetName
  try {
    assetName = decodeURIComponent(encodedAssetName)
  } catch {
    throw new Error(`Updater entry ${platform} contains an invalid asset name`)
  }
  if (!assetNamePattern.test(assetName)) {
    throw new Error(`Updater entry ${platform} contains an invalid asset name`)
  }

  const asset = releaseAssets.get(assetName)
  if (!asset) {
    throw new Error(
      `Updater entry ${platform} does not reference an asset in the expected release`
    )
  }
  return asset
}

export function normalizeUpdaterAssetUrls(
  manifest,
  { expectedVersion, repository, releaseAssets, releaseAssetsById }
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Updater manifest must be a JSON object")
  }

  if (!manifest.platforms || typeof manifest.platforms !== "object") {
    throw new Error("Updater manifest contains no platform map")
  }

  let normalizedCount = 0
  for (const [platform, update] of Object.entries(manifest.platforms)) {
    if (!update || typeof update !== "object" || Array.isArray(update)) {
      throw new Error(`Updater entry ${platform} is invalid`)
    }

    if (typeof update.url !== "string") {
      throw new Error(`Updater entry ${platform} has no URL`)
    }

    let updateUrl
    try {
      updateUrl = new URL(update.url)
    } catch {
      throw new Error(`Updater entry ${platform} has an invalid URL`)
    }

    let originalAssetId
    if (updateUrl.hostname === "api.github.com") {
      const assetPath = `/repos/${repository}/releases/assets/`
      originalAssetId = updateUrl.pathname.startsWith(assetPath)
        ? updateUrl.pathname.slice(assetPath.length)
        : ""

      if (
        updateUrl.protocol !== "https:" ||
        updateUrl.port !== "" ||
        updateUrl.username !== "" ||
        updateUrl.password !== "" ||
        updateUrl.search !== "" ||
        updateUrl.hash !== "" ||
        !/^[1-9]\d*$/.test(originalAssetId)
      ) {
        throw new Error(
          `Updater entry ${platform} has an invalid GitHub asset URL`
        )
      }

      const asset = releaseAssetsById.get(originalAssetId)
      if (!asset) {
        throw new Error(
          `Updater entry ${platform} does not reference a downloadable asset in the expected release`
        )
      }

      update.url = `https://github.com/${repository}/releases/download/v${expectedVersion}/${encodeURIComponent(asset.name)}`
      normalizedCount += 1
    }

    const asset = resolveUpdaterAsset(update.url, platform, {
      expectedVersion,
      repository,
      releaseAssets,
    })
    if (originalAssetId && String(asset.id) !== originalAssetId) {
      throw new Error(
        `Updater entry ${platform} resolved to a different GitHub release asset`
      )
    }
  }

  return normalizedCount
}
