# Contribuer à FXMP OS

FXMP OS est en développement. Avant de proposer un changement important, ouvre une Issue pour préciser le besoin. Les changements passent par une pull request vers main.

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

Les changements Rust destinés à Linux ou macOS doivent aussi être vérifiés sur leur plateforme. La CI du dépôt effectue ces contrôles sur Windows, Linux et macOS.

## Règles de contribution

- Utilise pnpm et conserve pnpm-lock.yaml cohérent avec package.json.
- Garde les commandes natives Tauri typées, limitées au besoin et protégées par les capabilities de chaque fenêtre.
- Ne demande pas à l’interface de contourner les permissions Tauri.
- N’ajoute aucune clé privée, aucun jeton ou donnée personnelle aux commits, logs, captures ou Issues.
- N’ajoute pas de crate Tauri interne directement sans besoin technique précis.
- Décris les changements visibles et les limites de vérification dans la pull request.
- Lie la pull request à son Issue avec Closes #<numéro> quand c’est pertinent.

Pour les vulnérabilités, suis la procédure de SECURITY.md, sans ouvrir d’Issue publique.
