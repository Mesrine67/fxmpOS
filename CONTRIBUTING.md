# Contribuer à FXMP OS

FXMP OS est un projet pré-version 1.0 avec des releases publiques Windows. Pour un changement important, ouvre une Issue afin de préciser le besoin. Les changements passent par une pull request vers `main`; ne pousse pas directement sur `main`.

## Environnement de développement

- Node.js 24
- pnpm 12.3.4, déclaré dans package.json
- Rust 1.95 ou plus récent
- Les prérequis natifs de Tauri 2 pour votre système, dont WebView2 sur Windows

Installation et lancement :

    pnpm install --frozen-lockfile
    pnpm tauri dev

Pour lancer uniquement l’interface web, utilise pnpm dev.

## Vérifications utiles

    pnpm lint
    pnpm typecheck
    pnpm build
    cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
    cargo check --locked --manifest-path src-tauri/Cargo.toml

La CI du dépôt exécute `pnpm typecheck` et `pnpm build` sur Ubuntu. Elle vérifie `cargo fmt` et `cargo check` sur Windows, puis compile aussi avec le MSRV Rust déclaré dans `Cargo.toml` (actuellement 1.95). Elle ne compile pas le backend Rust sur Linux ou macOS, car ces plateformes ne sont pas distribuées. Exécute `pnpm lint` localement pour contrôler ESLint; cette commande n'est pas actuellement une étape de la CI.

## Règles de contribution

- Utilise pnpm et conserve pnpm-lock.yaml cohérent avec package.json.
- Garde les commandes natives Tauri typées, limitées au besoin et protégées par les capabilities de chaque fenêtre.
- Ne demande pas à l’interface de contourner les permissions Tauri.
- N’ajoute aucune clé privée, aucun jeton ou donnée personnelle aux commits, logs, captures ou Issues.
- N’ajoute pas de crate Tauri interne directement sans besoin technique précis.
- Décris les changements visibles et les limites de vérification dans la pull request.
- Lie la pull request à son Issue avec Closes #<numéro> quand c’est pertinent.
- Pour une modification de l'application distribuée, synchronise les versions des manifestes, ajoute les notes vérifiées au `CHANGELOG.md`, puis suis la procédure de PR, tag et release documentée dans `AGENTS.md` et `UPDATE.md`. Les corrections de documentation seules ne nécessitent pas de nouvelle version de l'application.

Pour les vulnérabilités, suis la procédure de SECURITY.md, sans ouvrir d’Issue publique.
