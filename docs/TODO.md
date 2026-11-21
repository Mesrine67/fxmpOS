# Feuille de route technique — FXMP OS

Cette liste suit les travaux non encore validés. Elle n'indique pas qu'une fonction est présente ni prête à publier.

## En cours : Dock natif

- [ ] Terminer la PR #79 (réglages Dock intégrés à FXMP OS) sans retirer le programme Dock actuel tant que la parité n'est pas démontrée.
- [ ] Verrouiller `tauri-plugin-dock` sur une révision Git immuable et examiner ses sources et son script C++ de compilation.
- [ ] Vérifier le build Windows natif et les artefacts NSIS/MSI, ainsi que les capacités Tauri limitées à la fenêtre autorisée.
- [ ] Tester manuellement le Dock sous Windows : raccourcis Maintenir/Basculer, focus avec jeu au premier plan, moniteurs et DPI multiples, sélection de dossier, sauvegarde/restauration des réglages, fermeture et redémarrage.
- [ ] Ne supprimer les composants Win32 de secours qu'après validation fonctionnelle explicite.

## Validation et livraison

- [ ] Maintenir la CI frontend (TypeScript et Next.js), la CI Rust Windows stable/MSRV et les vérifications de sécurité.
- [ ] Vérifier le manifeste `latest.json`, les signatures Minisign et les SHA-256 des MSI/NSIS avant chaque publication.
- [ ] Garder les versions `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` et `src-tauri/Cargo.lock` synchronisées.
- [ ] Limiter le runner CI Windows local aux branches approuvées, sans exécuter directement les PR externes ni les branches Dependabot.

## Suivi distinct

- [ ] Suivre l'alerte GLib Linux dans l'issue #7 : la distribution officielle FXMP OS reste Windows x64 et la présence d'une dépendance Linux dans le verrou ne signifie pas que l'alerte soit corrigée.
- [ ] Vérifier en conditions réelles l'overlay, les réglages persistants, les notifications et les mesures système sans étendre les permissions ni transmettre de données locales.

Voir aussi `AGENTS.md`, `UPDATE.md` et `TAURI_PLUGIN_REVIEW.md` pour les contraintes détaillées du projet.
