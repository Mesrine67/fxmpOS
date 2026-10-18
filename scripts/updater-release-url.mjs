const assetNamePattern = /^[A-Za-z0-9][A-Za-z0-9 _().+-]{0,254}$/

export function resolveUpdaterAsset(
  value,
  platform,
  { expectedVersion, repository, releaseAssets, releaseAssetsById }
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

  if (updateUrl.hostname === "api.github.com") {
    const assetPath = `/repos/${repository}/releases/assets/`
    if (!updateUrl.pathname.startsWith(assetPath)) {
      throw new Error(
        `Updater entry ${platform} points outside the expected GitHub release`
      )
    }

    const assetId = updateUrl.pathname.slice(assetPath.length)
    if (!/^[1-9]\d*$/.test(assetId)) {
      throw new Error(
        `Updater entry ${platform} has an invalid GitHub asset ID`
      )
    }

    const asset = releaseAssetsById.get(assetId)
    if (!asset) {
      throw new Error(
        `Updater entry ${platform} does not reference an asset in the expected release`
      )
    }
    return asset
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
