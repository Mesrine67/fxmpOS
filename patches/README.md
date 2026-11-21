# GLib 0.18.5 — temporary Linux security backport

This directory vendors GLib 0.18.5 from `openOMSI-org/openOMSI`,
commit `8e49f4ae1fd68f6b27a5437fecd093f52afeb488`,
`launcher/patches/glib`. Upstream `glib/LICENSE` and `glib/COPYRIGHT`
remain intact. Source provenance was checked against the official
`glib-0.18.5.crate` archive (SHA-256:
`233daaf6e83ae6a12a52055f568f9d7cf4671dabb78ff9560ab6da230ce00ee5`).

## Security changes

The openOMSI backport addresses RUSTSEC-2024-0429 / GHSA-wrw7-89jp-8q8g
in `src/variant_iter.rs`: `VariantStrIter::impl_get` passes the
`g_variant_get_child` output pointer as `&mut p`.

An additional FXMP OS CodeQL hardening pass (commit `739669c`) changes
four other files:

- `src/log.rs`: do not include an unrecognized external log level
  value in a panic message.
- `src/object.rs`: remove redundant direct FFI `ref_count` reads
  from debug assertions. This does not eliminate the unsafe FFI caller
  validity contract.
- `src/value.rs`: check for null pointers before accessing `GValue`
  fields. It cannot establish validity of an arbitrary non-null FFI pointer.
- `src/collections/ptr_slice.rs`: use the already defined `pop()`
  operation when truncating, keeping the null-terminator invariant in
  one implementation.

A fifth file, `src/collections/strv.rs`, fixes five upstream test assertions that used `get_unchecked(4)` on a 4-element slice. The test now reads the documented NULL sentinel at the underlying allocation boundary via the raw pointer. This removes an out-of-bounds precondition violation under Rust 1.99.

These files now intentionally differ from the openOMSI reference;
security assessment should use this exact source, not the original
one-file-difference baseline.

## Testing and remaining risk

Under Ubuntu WSL with Rust 1.99, the modified crate passed all 226 unit tests (`cargo test --lib -j 2`), without any exclusions. Full Linux application compilation and independent
review of the FFI memory-safety contracts are still required.

The GTK3/Wry dependency graph still resolves a crate named GLib 0.18.5.
Version-based dependency scanners may report the upstream vulnerability
even if the local backport is effective. Do **not** mark it as an upstream
fixed release or dismiss other CodeQL reports without specific evidence.

Official FXMP OS releases remain Windows x64-only. Drop this backport
when the project moves to a compatible verified upstream implementation.
