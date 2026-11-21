# Suivi des crates Rust — FXMP OS

Ce document suit les travaux Rust non livrés et les risques résiduels. Il ne constitue pas une preuve qu'une vulnérabilité est corrigée.

## Chaîne Linux GTK3 / GLib — issue #7

- [ ] Vérifier `glib 0.18.5`, `gdk 0.18.2`, `wry 0.57.0` et la version réelle de Tauri dans `src-tauri/Cargo.lock`.
- [ ] Examiner le correctif GLib d'openOMSI : `launcher/patches/glib/src/variant_iter.rs`, qui rend mutable le pointeur écrit par `g_variant_get_child` (RUSTSEC-2024-0429 / GHSA-wrw7-89jp-8q8g).
- [ ] Si un backport est intégré, préserver le code original de GLib, ses fichiers `LICENSE` et `COPYRIGHT`, documenter précisément la différence et vérifier le hash/la provenance des sources.
- [ ] Tester `cargo tree --target all --invert glib` et un build Linux réel ; ne pas considérer une version patchée toujours nommée `0.18.5` comme automatiquement reconnue par Dependabot.
- [ ] Suivre la migration GTK4/WebKitGTK 6 de Tauri/Wry ; supprimer tout correctif temporaire une fois une migration stable validée.
- [ ] Ne pas réactiver de distribution Linux avant tests fonctionnels, sécurité et signatures.

## Chaîne Windows / Tauri

- [ ] Préserver le build Windows NSIS/MSI, la vérification des signatures updater et le manifeste `latest.json`.
- [ ] Garder la CI Rust stable, Rust MSRV 1.95, le contrôle Cargo et les actions GitHub protégées.
- [ ] Terminer la PR #79 de Dock intégré : conflits, validation des dépendances C++/Rust et essais manuels (focus, raccourcis, moniteurs, DPI, fermeture).
- [ ] Conserver la révision immuable du plugin Dock et la portée minimale des capacités Tauri.

## Dépendances npm, pour suivi transversal

- [x] Intégrer les versions corrigées de `minimatch` et `systeminformation` par la PR #93 ; configurer les overrides pnpm 12 dans `pnpm-workspace.yaml`.
- [ ] Contrôler la fermeture effective des alertes Dependabot sur le commit de `main` après réanalyse ; vérifier le build frontend.

Liens : [issue #7](https://github.com/Mesrine67/fxmpOS/issues/7), [PR #79](https://github.com/Mesrine67/fxmpOS/pull/79), [PR #93](https://github.com/Mesrine67/fxmpOS/pull/93), [correctif openOMSI](https://github.com/openOMSI-org/openOMSI/tree/main/launcher/patches).
