# GLib 0.18.5 Linux-only dependency security backport

This directory contains GLib 0.18.5 copied from `openOMSI-org/openOMSI`,
commit `8e49f4ae1fd68f6b27a5437fecd093f52afeb488`,
`launcher/patches/glib`. The original GLib license and copyright are retained
in `glib/LICENSE` and `glib/COPYRIGHT`.

Its `src/variant_iter.rs` includes the backport of RUSTSEC-2024-0429:
`VariantStrIter::impl_get` uses a mutable local pointer `p` and passes
`&mut p` to `g_variant_get_child`.

The GTK3/Wry Linux graph still resolves a crate named `glib 0.18.5`.
The GitHub Dependabot version-based alert may remain open even with this
source-level mitigation. Do not classify it as a fixed upstream release.
The official FXMP OS distribution stays Windows x64-only. Linux support
requires actual build and runtime validation and stable Tauri/Wry migration.
Remove this backport once a verified upstream compatible fix is available.
