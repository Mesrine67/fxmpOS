<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Consignes du projet

- Conserver le bloc Next.js géré ci-dessus. Pour les changements Next.js, lire la documentation locale correspondante dans `node_modules/next/dist/docs/`.
- Utiliser `pnpm` pour les commandes JavaScript. `pnpm dev` démarre uniquement le frontend; `pnpm tauri dev` lance le frontend et l'application desktop Tauri. L'URL de développement configurée est `http://localhost:3000`.
- Le tableau de bord et les valeurs actuels sont une maquette avec des données d'exemple (`app/dashboard/data.json`). Ne pas présenter les cartes ou graphiques comme des mesures système réelles tant qu'une collecte native n'est pas implémentée.
- La page `/account` lit localement le nom du PC, Windows, le processeur, la mémoire, le temps de fonctionnement et les volumes via `get_system_snapshot`; ne pas lui attribuer de mesures GPU ou de température qui ne sont pas collectées.
- La page `/settings` vérifie les mises à jour Tauri et laisse l'utilisateur confirmer l'installation. Garder la clé publique et l'URL de manifeste synchronisées avec `UPDATE.md`; ne jamais ajouter la clé privée de signature au dépôt.
- Garder les permissions Tauri cohérentes avec les plugins réellement présents dans `src-tauri/Cargo.toml` et initialisés dans `src-tauri/src/lib.rs`. Ne pas ajouter une permission de plugin absent.
- Chaque entrée de `bundle.resources` dans `src-tauri/tauri.conf.json` doit pointer vers un fichier ou dossier existant sous `src-tauri`.
- La configuration du logger se fait dans `src-tauri/src/lib.rs`; vérifier le type de configuration attendu par un plugin avant d'ajouter son bloc dans `tauri.conf.json`.
