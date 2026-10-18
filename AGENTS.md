<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Consignes du projet

- Conserver le bloc Next.js géré ci-dessus. Pour les changements Next.js, lire la documentation locale correspondante dans `node_modules/next/dist/docs/`.
- Utiliser `pnpm` pour les commandes JavaScript. `pnpm dev` démarre uniquement le frontend; `pnpm tauri dev` lance le frontend et l'application desktop Tauri. L'URL de développement configurée est `http://localhost:3000`.
- Le gestionnaire officiel est pnpm 12.3.4 (`packageManager` dans `package.json`); utiliser `pnpm install --frozen-lockfile` et ne conserver que `pnpm-lock.yaml`. N'autoriser dans `pnpm-workspace.yaml` que les scripts d'installation nécessaires après inspection du paquet.
- Le tableau de bord et les valeurs actuels sont une maquette avec des données d'exemple (`app/dashboard/data.json`). Ne pas présenter les cartes ou graphiques comme des mesures système réelles tant qu'une collecte native n'est pas implémentée.
- La page `/account` lit localement les références non uniques du PC et de la carte mère, les cartes graphiques et versions de pilotes sur Windows, la version du système, le processeur, la mémoire vive et virtuelle, le temps de fonctionnement, les volumes et les métadonnées des écrans via des commandes natives. Ne pas exposer les numéros de série/UUID/EDID, ni annoncer une charge GPU ou une température qui n'est pas mesurée.
- La page `/settings` vérifie les mises à jour Tauri et laisse l'utilisateur confirmer l'installation. Garder la clé publique et l'URL de manifeste synchronisées avec `UPDATE.md`; ne jamais ajouter la clé privée de signature au dépôt.
- Garder les capacités Tauri séparées et limitées aux fenêtres `main` et `overlay` et aux commandes réellement utilisées. `overlay` ne reçoit que la lecture des mesures compactes et le déplacement de sa fenêtre; `main` gère les écrans et son affichage. Les commandes Rust sont groupées par domaine sous `src-tauri/src/commands/`; exposer des fonctions typées et en lecture seule si la fonctionnalité n'exige pas d'écriture.
- La commande `/account` ne renvoie que des informations système locales; ne pas envoyer ces détails ou de futurs identifiants à un service distant sans fonctionnalité explicite. Ne pas installer de coffre de secrets tant qu'aucun secret applicatif n'est stocké.
- La fermeture de la fenêtre principale masque FXMP OS dans la zone de notification; le menu de tray reste le chemin de sortie explicite. Le démarrage Windows est facultatif et désactivé par défaut.
- Les fenêtres Tauri `main` et `overlay` restent `create: false` dans `tauri.conf.json`; créez-les depuis leur `WindowConfig` avec `WebviewWindowBuilder::from_config`. L'overlay utilise les API de fenêtre Tauri et un profil WebView partagé pour les préférences locales; ne lui attribuez pas de `dataDirectory` isolé sans changer ce stockage.
- L'overlay ne collecte que mémoire vive et nom de l'hôte, avec une commande dédiée légère. Les dimensions, zones de travail et positions d'écran passent par une commande native; n'ajoutez ni capture d'écran ni identifiants EDID pour ce besoin.
- La navigation WebView doit rester sur son origine locale. N'ouvrir à l'extérieur que `http`, `https`, `mailto` et `tel`; refuser tous les autres schémas.
- Les journaux de navigation externe ne doivent contenir que l'origine HTTP(S) ou le schéma expurgé; ne jamais journaliser le chemin, la requête, le fragment, les identifiants d'URL ni une erreur qui peut les recopier.
- Le workflow de release garde les versions en brouillon jusqu'à la vérification du manifeste, des signatures Minisign et des sommes SHA-256.
- L'updater doit garder `requireSignedVersion: true` et `allowDowngrades: false`; vérifier les nouvelles signatures de version via le CLI Tauri avant de publier des artefacts.
- Épingler les GitHub Actions par SHA complet; le workflow Dependabot propose les mises à jour des SHA chaque semaine.
- Les certificats Authenticode et Apple sont des secrets CI distincts de la clé Minisign de l'updater. Ne jamais journaliser ni committer ces certificats ou mots de passe.
- Garder le MSRV Rust de `src-tauri/Cargo.toml` cohérent avec les plugins; CI doit compiler les cibles Linux, Windows et macOS et vérifier `rustfmt`.
- Avant de publier une release, vérifier que le tag `vX.Y.Z` correspond à la version déclarée de façon identique dans `package.json`, `tauri.conf.json` et `Cargo.toml`; une exécution manuelle n'est admise que depuis la branche par défaut. Comme `tauri-action` peut écrire des URLs REST `/releases/assets/{id}` dans `latest.json`, le workflow doit les convertir en URLs navigateur `/releases/download/vX.Y.Z/<asset>` avant publication; le vérificateur refuse les URLs REST, les plateformes manquantes et les actifs hors de la release attendue.
- Garder `OPENCLAW_PRACTICES.md` à jour lorsque les choix Tauri, de permissions, d'updater ou de cycle de vie inspirés d'OpenClaw changent. N'importer que les patterns adaptés à une app locale de monitoring, pas son Gateway ni son exécution d'agents.
- Garder `OPENHUMAN_PRACTICES.md` à jour lorsque l'architecture native, les permissions, les secrets ou les fonctions de contrôle système changent. Les règles métier et les validations système restent dans Rust; React présente les résultats. Toute future action système avec effet de bord doit être limitée côté Rust, confirmée quand elle peut interrompre ou détruire des données, et journalisée sans secrets ni identifiants uniques. Ne pas ajouter un shell arbitraire, un serveur RPC distant ou un coffre de secrets sans fonctionnalité qui le justifie.
- Garder les permissions Tauri cohérentes avec les plugins réellement présents dans `src-tauri/Cargo.toml` et initialisés dans `src-tauri/src/lib.rs`. Ne pas ajouter une permission de plugin absent.
- Utiliser `tauri` comme façade applicative. `tauri-runtime`, `tauri-runtime-wry`, `tauri-macros`, `tauri-utils` et `tauri-codegen` sont gérés transitivement; ne pas les ajouter directement sans utilisation ciblée. Garder `tauri-build` en dépendance de build directe tant que `build.rs` l'appelle. Garder `@tauri-apps/api` et `@tauri-apps/cli` dans le manifeste pnpm.
- `src-tauri/tauri.conf.json` doit rester conforme au schéma officiel Tauri v2. Le schéma n'accepte pas de propriété `crate`; ne pas insérer cette clé non prise en charge.
- Chaque entrée de `bundle.resources` dans `src-tauri/tauri.conf.json` doit pointer vers un fichier ou dossier existant sous `src-tauri`.
- La configuration du logger se fait dans `src-tauri/src/lib.rs`; vérifier le type de configuration attendu par un plugin avant d'ajouter son bloc dans `tauri.conf.json`.
