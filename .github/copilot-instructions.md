# Instructions pour les agents de code

- Lis AGENTS.md, README.md et les instructions du dossier concerné avant de modifier le dépôt.
- Utilise pnpm; ne réintroduis pas Bun ni bun.lock.
- Conserve la configuration Tauri v2 conforme à son schéma. Les fenêtres créées à la demande par Rust gardent create: false et sont construites depuis leur configuration Tauri.
- Maintiens des capabilities distinctes et minimales pour main et overlay. Le backend Rust valide les actions système.
- Ne place jamais de clé privée, jeton, secret de signature ou donnée personnelle dans le code, les logs ou une pull request. La clé Minisign reste dans le secret GitHub TAURI_SIGNING_PRIVATE_KEY.
- N’ajoute pas de propriété crate non prise en charge à tauri.conf.json.
- Ne déclare pas un contrôle matériel ou un test comme effectué si tu ne l’as pas réellement lancé et observé.
- Pour les changements concernés, exécute les commandes de validation listées dans CONTRIBUTING.md et distingue les résultats passés, échoués et non exécutés.
