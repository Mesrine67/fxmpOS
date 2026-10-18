# FXMP OS

FXMP OS est une application desktop Tauri 2 avec une interface Next.js 16 et React 19. Elle fournit un tableau de bord PC en cours de prototypage.

## État actuel

L'écran principal est encore une maquette : le tableau lit ses exemples depuis `app/dashboard/data.json`, et les cartes et graphiques affichent des valeurs de démonstration.

La page **Account** affiche des informations réelles de l'appareil : nom du PC, version et build de Windows, architecture, langue, session Windows, processeur, cœurs, mémoire vive, temps de fonctionnement et volumes de stockage. Elle utilise le plugin Tauri officiel `os` et la crate Rust `sysinfo`, interrogés par la commande `get_system_snapshot`. Ces informations sont lues localement. La collecte du GPU et des températures n'est pas incluse.

La page **Settings** permet de vérifier les mises à jour Tauri signées et de les installer après confirmation. Les versions sont distribuées par les releases publiques de GitHub; le vérificateur ne met rien à jour automatiquement. Voir [UPDATE.md](UPDATE.md) pour la publication, la clé de développement et la procédure de version.

## Lancer l'application

Depuis le dossier du projet :

```powershell
pnpm tauri dev
```

Cette commande démarre Next.js sur `http://localhost:3000`, compile le binaire Rust si nécessaire, puis ouvre la fenêtre Tauri **FXMP OS**. Garder le terminal ouvert pendant le développement; `Ctrl+C` arrête l'application et le serveur.

Commandes utiles :

| Commande | Usage |
| --- | --- |
| `pnpm tauri dev` | Lance l'application desktop complète. |
| `pnpm dev` | Lance uniquement le serveur web Next.js. |
| `pnpm build` | Génère l'export statique Next.js dans `out/`. |
| `pnpm typecheck` | Vérifie les types TypeScript. |

## Organisation

- `app/`, `components/`, `hooks/`, `lib/` : interface et logique frontend.
- `app/dashboard/data.json` : données d'exemple du tableau.
- `src-tauri/src/` : hôte et commandes Rust.
- `src-tauri/tauri.conf.json` : URL de développement, fenêtre et configuration Tauri.
- `src-tauri/capabilities/` : permissions frontend de Tauri.
- `.github/workflows/release.yml` : génération des installateurs et du manifeste Tauri signés pour les tags `v*`.
