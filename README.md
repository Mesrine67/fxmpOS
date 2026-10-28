# FXMP OS

FXMP OS est une application desktop Windows construite avec Tauri 2, Next.js 16 et React 19. Elle réunit un tableau de contrôle local du PC, un moniteur de ressources, l'inventaire des applications, les informations de l'appareil et un overlay configurable.

## Contribution et sécurité

Les règles de contribution, les modèles de signalement et de pull request et la politique de sécurité sont décrits dans CONTRIBUTING.md, SECURITY.md et le dossier .github.

## État actuel

La page d'accueil (`/`) lit localement les informations système, les écrans et les mesures CPU/mémoire/réseau via des commandes Rust. Les mesures en direct sont actualisées toutes les 10 secondes tant que la page est visible; l'heure de lecture et les erreurs sont affichées. L'ancien chemin `/dashboard` redirige vers `/` et `app/dashboard/data.json` ne fournit pas les mesures du tableau de contrôle.

La page **Ressources** (`/monitor`) actualise CPU, mémoire et processus toutes les 2 secondes, les endpoints TCP/UDP toutes les 5 secondes, et suspend ces lectures quand la page est masquée ou en pause. Elle montre aussi la charge par processeur logique, les débits réseau agrégés et la charge GPU si les compteurs Windows sont disponibles; aucune température n'est mesurée. La liste de processus est limitée aux 50 entrées les plus consommatrices et affiche nom, PID, CPU et mémoire uniquement. L'historique local conserve dans `fxmp-resource-history.json` jusqu'à 7 jours de moyennes CPU/mémoire par minute; processus, PID, ports et débits réseau ne sont pas persistés.

La page **Account** affiche des informations réelles de l'appareil : modèle et fabricant du PC et de la carte mère, contrôleurs graphiques et pilotes, version et build de Windows, architecture, langue, nom du compte et détails non secrets de la session, processeur, cœurs, mémoire vive et virtuelle, temps de fonctionnement, volumes de stockage et écrans détectés. Les écrans sont décrits par leur nom disponible, résolution, position, zone de travail et échelle; aucun EDID, numéro de série ou identifiant unique n'est lu. La commande `get_system_snapshot` lit les détails système avec `sysinfo` et les contrôleurs graphiques avec une requête WMI locale sur Windows. La charge GPU et les températures ne sont pas mesurées.

La page **Applications** combine les entrées de désinstallation des vues 32/64 bits du registre Windows et les applications Store/MSIX déclarées pour l'utilisateur courant. Les sources restent identifiées et leurs erreurs sont affichées séparément. La page présente les métadonnées disponibles et les icônes Windows, sans lancer de désinstallation ni exposer de chemin, commande ou identifiant interne. Certains paquets système ou sans application lançable peuvent être absents; la taille est une valeur déclarée par Windows ou l'installateur.

La page **Settings** regroupe les réglages d'application, d'overlay, de thème, de notifications et de mise à jour. L'overlay transparent mémorise l'écran, l'ancrage, la position physique, l'opacité, le premier plan et le clic traversant dans le store Tauri. Si l'écran mémorisé n'est plus présent, l'overlay revient sur l'écran principal. Il affiche la mémoire vive lue localement, actualisée toutes les cinq secondes. Settings propose une mesure réseau à la demande vers `1.1.1.1:443` : médiane, minimum, variation et pertes sur cinq connexions TCP (délai maximal de 750 ms par essai). Cette mesure n'est pas un ping ICMP et aucun résultat n'est envoyé à un service FXMP.

Les thèmes offrent les apparences système/clair/sombre, les styles Mira/Nova, bases neutres, accents, couleurs de graphiques, polices et arrondis. Les composants shadcn utilisent les tokens CSS configurés et les aperçus montrent le résultat appliqué. Les préférences sont locales et partagées entre les fenêtres avec `@tauri-apps/plugin-store`.

Les toasts dans FXMP OS utilisent Sonner; les notifications système Windows passent par `tauri-plugin-notification`. Ces canaux sont indépendants et peuvent tous deux envoyer un événement au premier plan si leurs options sont activées. Le canal natif est désactivé par défaut et l'autorisation Windows n'est demandée qu'après une action explicite dans Settings. Le contenu des notifications n'inclut pas de mesures du PC, processus, ports ni identifiants.

La page **Settings** affiche version installée et proposée, date de publication, notes de version, cible Windows x64, source du manifeste, état de vérification et progression du téléchargement. Elle liste aussi les releases publiques avec recherche, notes complètes, fichiers, tailles, téléchargements et empreintes SHA-256 disponibles. Cet historique public vient de l'API GitHub et ne reçoit aucune information du PC. Le manifeste doit porter la même version que celle liée à la signature Minisign; Tauri refuse les signatures invalides et les retours à une version antérieure. La vérification ne déclenche jamais d'installation automatique : l'utilisateur télécharge, puis choisit séparément d'installer et redémarrer. Chaque release doit avoir ses notes dans [CHANGELOG.md](CHANGELOG.md), reprises dans la release GitHub et le manifeste. Voir [UPDATE.md](UPDATE.md) pour la publication, les secrets de signature et la procédure de version.

La barre latérale propose trois espaces : **OS** (centre de contrôle, Ressources, Applications, Appareil et Paramètres), **Overlays** (réglages du widget) et **Games** (localhost, bibliothèque de jeux et réglages). Les pages Games sont actuellement des espaces préparatoires et renvoient vers les fonctions Ressources, Applications ou Paramètres existantes; elles ne détectent pas encore une bibliothèque de jeux dédiée.

Sous Windows, le setup NSIS installe FXMP OS pour l'utilisateur courant sans demander les droits administrateur. Il suit la langue de Windows (français ou anglais), utilise l'icône FXMP OS et crée le raccourci Menu Démarrer; le runtime WebView2 est vérifié et son bootstrapper est lancé silencieusement uniquement s'il manque. L'installation MSI reste également disponible. Voir [UPDATE.md](UPDATE.md) pour la signature Authenticode et les avertissements SmartScreen.

La version source de l'application est `0.0.38` (28 octobre 2026); les versions 0.x sont publiques mais restent antérieures à 1.0. Les pratiques d'OpenClaw pertinentes pour cette application et celles qui ne correspondent pas à son architecture sont résumées dans [OPENCLAW_PRACTICES.md](OPENCLAW_PRACTICES.md).

Les choix réutilisables d'OpenHuman concernant la séparation Rust/interface, les permissions, les futures actions système et la protection des secrets sont évalués dans [OPENHUMAN_PRACTICES.md](OPENHUMAN_PRACTICES.md).

FXMP OS possède une icône de zone de notification : fermer la fenêtre la masque sans arrêter le processus. Un clic gauche sur l’icône ouvre ou masque la fenêtre; le menu natif au clic droit propose l’accès au centre de contrôle, aux principales pages, aux onglets de paramètres, ainsi qu’aux actions pour afficher ou quitter FXMP OS. Le démarrage automatique est désactivé par défaut et peut être activé dans **Paramètres**; le lancement automatique démarre l’application masquée. Une seule instance est autorisée.

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
- `app/dashboard/data.json` : anciennes données de démonstration, non utilisées par le centre de contrôle `/`.
- `src-tauri/src/` : orchestration Tauri, navigation externe, zone de notification et commandes natives séparées par domaine.
- `src-tauri/src/commands/system.rs` : commande en lecture seule qui renvoie le relevé PC typé.
- `src-tauri/src/commands/installed_apps.rs` : lecture locale des entrées de programmes du registre Windows.
- `src-tauri/src/commands/display.rs` et `overlay.rs` : métadonnées d'écran et cycle de vie natif de l'overlay.
- `app/overlay/page.tsx` : route exportée par Next.js pour le WebView compact de l'overlay.
- `src-tauri/tauri.conf.json` : URL de développement, fenêtre et configuration Tauri.
- `src-tauri/capabilities/` : permissions frontend séparées pour les fenêtres `main` et `overlay`.
- `.github/workflows/release.yml` : génération des installateurs et du manifeste Tauri signés pour les tags `v*`.
- `.github/workflows/ci.yml` : typecheck et build frontend sur Ubuntu; formatage et compilation Rust, ainsi que le MSRV Rust 1.95, sur Windows lors des PR et des pushes sur `main`.
- `.github/dependabot.yml` : propositions hebdomadaires de mise à jour des dépendances npm/pnpm, Cargo et des actions GitHub.
- `scripts/validate-release-source.mjs`, `scripts/get-release-notes.mjs`, `scripts/normalize-updater-release.mjs`, `scripts/verify-updater-release.mjs` et `scripts/github-release.mjs` : garde-fous de version, notes de changelog, normalisation d'URLs et vérification des assets de release brouillon avant publication.

La distribution et les builds Rust natifs sont limités à Windows x64 (NSIS et MSI). Aucun paquet macOS, Linux, Android ou iOS n'est produit pour l'instant; le contrôle frontend générique utilise un runner Linux. Les artefacts updater Windows sont signés avec Minisign. Authenticode est séparé et n'est appliqué que si le certificat est configuré dans les secrets GitHub; sans lui, Windows peut afficher un avertissement SmartScreen. Le binaire Windows autonome, lorsqu'il est publié, est expérimental et n'est pas un mode portable Tauri officiellement pris en charge.

## Architecture Tauri et dépendances

FXMP OS utilise la crate `tauri` comme façade Rust et `@tauri-apps/api` comme API TypeScript pour la communication entre l'interface et le backend. `@tauri-apps/cli` fournit les commandes de développement et de build.

| Composant                                        | Intégration FXMP OS                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `tauri-runtime` et `tauri-runtime-wry`           | Fournis transitivement par `tauri`; Wry est le runtime desktop utilisé.                                           |
| `tauri-macros`, `tauri-utils` et `tauri-codegen` | Fournis transitivement par Tauri et ses outils de build. Ne pas les ajouter directement sans besoin d'API précis. |
| `tauri-build`                                    | Dépendance de build directe; `src-tauri/build.rs` l'utilise pour générer les permissions de commande.             |
| Tauri API TypeScript (`packages/api`)            | Dépendance directe `@tauri-apps/api` dans `package.json`.                                                         |
| `tauri-plugin-store`                             | Préférences locales partagées et historique borné de mesures CPU/mémoire.                                        |
| `tauri-plugin-notification`                      | Notifications natives Windows en arrière-plan avec autorisation demandée explicitement.                          |

Les versions transitives sont résolues par Cargo via `Cargo.lock`; conserver les crates internes alignées sur les dépendances de Tauri plutôt que de les épingler séparément. La crate Rust `tauri-plugin-os` fournit quelques détails système à `get_system_snapshot`; l'interface passe par cette commande native et n'utilise pas l'API JavaScript du plugin.

`main` et `overlay` utilisent `create: false`; le démarrage crée `main` depuis sa configuration et la commande Rust crée `overlay` à la demande avec `WebviewWindowBuilder::from_config`. L'URL `overlay/` correspond à la route statique `out/overlay/index.html`. Ne pas définir de `dataDirectory` propre à l'overlay sans migrer les préférences partagées : un répertoire de WebView personnalisé sépare son stockage local.

La revue du catalogue officiel et des candidats communautaires est dans [TAURI_PLUGIN_REVIEW.md](TAURI_PLUGIN_REVIEW.md). L'overlay et la détection des écrans utilisent les API Tauri intégrées; aucun plugin additionnel n'est nécessaire pour ces deux fonctions. La configuration doit rester conforme au schéma Tauri v2. Celui-ci ne définit pas de propriété `crate`; ne pas ajouter cette clé à `src-tauri/tauri.conf.json`.
