# FXMP OS

FXMP OS est une application desktop Tauri 2 avec une interface Next.js 16 et React 19. Elle fournit un tableau de bord PC en cours de prototypage.

## Contribution et sécurité

Les règles de contribution, les modèles de signalement et de pull request et la politique de sécurité sont décrits dans CONTRIBUTING.md, SECURITY.md et le dossier .github.

## État actuel

L'écran principal est encore une maquette : le tableau lit ses exemples depuis `app/dashboard/data.json`, et les cartes et graphiques affichent des valeurs de démonstration.

La page **Account** affiche des informations réelles de l'appareil : modèle et fabricant du PC et de la carte mère, contrôleurs graphiques et pilotes, version et build de Windows, architecture, langue, nom du compte et détails non secrets de la session, processeur, cœurs, mémoire vive et virtuelle, temps de fonctionnement, volumes de stockage et écrans détectés. Les écrans sont décrits par leur nom disponible, résolution, position, zone de travail et échelle; aucun EDID, numéro de série ou identifiant unique n'est lu. La commande `get_system_snapshot` lit les détails système avec `sysinfo` et les contrôleurs graphiques avec une requête WMI locale sur Windows. La charge GPU et les températures ne sont pas mesurées.

La page **Applications** recherche les programmes de bureau inscrits dans les vues 32 et 64 bits du registre Windows, pour l'utilisateur actif ou tous les utilisateurs. Elle présente éditeur, version, date et taille déclarées, sans lancer de désinstallation ni exposer de chemin ou de commande. Les applications Microsoft Store qui n'ont pas d'entrée de bureau peuvent être absentes.

La page **Settings** configure aussi un overlay transparent : activation au lancement, écran, position dans sa zone de travail, opacité, premier plan et clic traversant. La position déplacée à la souris est mémorisée en coordonnées physiques et restaurée au prochain lancement; si l'écran n'est plus présent, l'overlay revient sur l'écran principal. L'overlay affiche la mémoire vive lue localement, actualisée toutes les cinq secondes. Settings propose une mesure réseau à la demande vers `1.1.1.1:443` : médiane, minimum, variation et pertes sur cinq connexions TCP (délai maximal de 750 ms par essai). Cette mesure n'est pas un ping ICMP et aucun résultat n'est envoyé à un service FXMP.

La page **Settings** affiche version installée et proposée, date de publication, notes de version, cible Windows x64, source du manifeste, état de vérification et progression du téléchargement. Elle liste aussi l'historique des releases stables avec recherche, notes complètes, fichiers, tailles, téléchargements et empreintes SHA-256 disponibles. Cet historique public vient de l'API GitHub et ne reçoit aucune information du PC. Le manifeste doit porter la même version que celle liée à la signature Minisign; Tauri refuse les signatures invalides et les retours à une version antérieure. Le vérificateur ne met rien à jour automatiquement. Chaque release doit avoir ses notes dans [CHANGELOG.md](CHANGELOG.md), reprises dans la release GitHub et le manifeste. Voir [UPDATE.md](UPDATE.md) pour la publication, les secrets de signature et la procédure de version.

Sous Windows, le setup NSIS installe FXMP OS pour l'utilisateur courant sans demander les droits administrateur. Il suit la langue de Windows (français ou anglais), utilise l'icône FXMP OS et crée le raccourci Menu Démarrer; le runtime WebView2 est vérifié et son bootstrapper est lancé silencieusement uniquement s'il manque. L'installation MSI reste également disponible. Voir [UPDATE.md](UPDATE.md) pour la signature Authenticode et les avertissements SmartScreen.

Les pratiques d'OpenClaw pertinentes pour cette application et celles qui ne correspondent pas à son architecture sont résumées dans [OPENCLAW_PRACTICES.md](OPENCLAW_PRACTICES.md).

Les choix réutilisables d'OpenHuman concernant la séparation Rust/interface, les permissions, les futures actions système et la protection des secrets sont évalués dans [OPENHUMAN_PRACTICES.md](OPENHUMAN_PRACTICES.md).

FXMP OS possède une icône de zone de notification : fermer la fenêtre la masque sans arrêter le processus. Le menu de l’icône permet de la rouvrir ou de quitter réellement l’application. Le démarrage automatique est désactivé par défaut et peut être activé dans **Settings**; le lancement automatique démarre l’application masquée. Une seule instance est autorisée.

## Lancer l'application

Depuis le dossier du projet :

Installer d'abord les dépendances frontend avec la version de pnpm déclarée dans `package.json` :

```powershell
pnpm install --frozen-lockfile
```

```powershell
pnpm tauri dev
```

Cette commande démarre Next.js sur `http://localhost:3000`, compile le binaire Rust si nécessaire, puis ouvre la fenêtre Tauri **FXMP OS**. Garder le terminal ouvert pendant le développement; `Ctrl+C` arrête l'application et le serveur.

Commandes utiles :

| Commande         | Usage                                                            |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm tauri dev` | Lance l'application desktop complète.                            |
| `pnpm dev`       | Lance uniquement le serveur web Next.js.                         |
| `pnpm build`     | Génère l'export statique Next.js dans `out/`.                    |
| `pnpm lint`      | Vérifie les sources de l’application et les scripts avec ESLint. |
| `pnpm typecheck` | Vérifie les types TypeScript.                                    |

## Organisation

- `app/`, `components/`, `hooks/`, `lib/` : interface et logique frontend.
- `app/dashboard/data.json` : données d'exemple du tableau.
- `src-tauri/src/` : orchestration Tauri, navigation externe, zone de notification et commandes natives séparées par domaine.
- `src-tauri/src/commands/system.rs` : commande en lecture seule qui renvoie le relevé PC typé.
- `src-tauri/src/commands/installed_apps.rs` : lecture locale des entrées de programmes du registre Windows.
- `src-tauri/src/commands/display.rs` et `overlay.rs` : métadonnées d'écran et cycle de vie natif de l'overlay.
- `app/overlay/page.tsx` : route exportée par Next.js pour le WebView compact de l'overlay.
- `src-tauri/tauri.conf.json` : URL de développement, fenêtre et configuration Tauri.
- `src-tauri/capabilities/` : permissions frontend séparées pour les fenêtres `main` et `overlay`.
- `.github/workflows/release.yml` : génération des installateurs et du manifeste Tauri signés pour les tags `v*`.
- `.github/workflows/ci.yml` : vérification frontend et compilation Rust pour Windows; contrôle du MSRV Rust 1.95 également sous Windows lors des PR et des pushes sur `main`.
- `.github/dependabot.yml` : propositions hebdomadaires de mise à jour des dépendances npm/pnpm, Cargo et des actions GitHub.
- `scripts/validate-release-source.mjs`, `scripts/get-release-notes.mjs`, `scripts/normalize-updater-release.mjs`, `scripts/verify-updater-release.mjs` et `scripts/github-release.mjs` : garde-fous de version, notes de changelog, normalisation d'URLs et vérification des assets de release brouillon avant publication.

La distribution et les builds Rust natifs sont limités à Windows (NSIS et MSI). Aucun paquet macOS, Linux, Android ou iOS n'est produit pour l'instant; le contrôle frontend générique utilise un runner Linux. Les artefacts updater Windows sont signés avec Minisign et Authenticode se configure avec les secrets GitHub. Le binaire Windows autonome est expérimental et n'est pas un mode portable Tauri officiellement pris en charge.

## Architecture Tauri et dépendances

FXMP OS utilise la crate `tauri` comme façade Rust et `@tauri-apps/api` comme API TypeScript pour la communication entre l'interface et le backend. `@tauri-apps/cli` fournit les commandes de développement et de build.

| Composant                                        | Intégration FXMP OS                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `tauri-runtime` et `tauri-runtime-wry`           | Fournis transitivement par `tauri`; Wry est le runtime desktop utilisé.                                           |
| `tauri-macros`, `tauri-utils` et `tauri-codegen` | Fournis transitivement par Tauri et ses outils de build. Ne pas les ajouter directement sans besoin d'API précis. |
| `tauri-build`                                    | Dépendance de build directe; `src-tauri/build.rs` l'utilise pour générer les permissions de commande.             |
| Tauri API TypeScript (`packages/api`)            | Dépendance directe `@tauri-apps/api` dans `package.json`.                                                         |

Les versions transitives sont résolues par Cargo via `Cargo.lock`; conserver les crates internes alignées sur les dépendances de Tauri plutôt que de les épingler séparément. La crate Rust `tauri-plugin-os` fournit quelques détails système à `get_system_snapshot`; l'interface passe par cette commande native et n'utilise pas l'API JavaScript du plugin.

`main` et `overlay` utilisent `create: false`; le démarrage crée `main` depuis sa configuration et la commande Rust crée `overlay` à la demande avec `WebviewWindowBuilder::from_config`. L'URL `overlay/` correspond à la route statique `out/overlay/index.html`. Ne pas définir de `dataDirectory` propre à l'overlay sans migrer les préférences partagées : un répertoire de WebView personnalisé sépare son stockage local.

La revue du catalogue officiel et des candidats communautaires est dans [TAURI_PLUGIN_REVIEW.md](TAURI_PLUGIN_REVIEW.md). L'overlay et la détection des écrans utilisent les API Tauri intégrées; aucun plugin additionnel n'est nécessaire. La configuration doit rester conforme au schéma Tauri v2. Celui-ci ne définit pas de propriété `crate`; ne pas ajouter cette clé à `src-tauri/tauri.conf.json`.
