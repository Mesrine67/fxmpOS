# Mises à jour Tauri — FXMP OS

## Canal de distribution

Les paquets signés et le manifeste updater sont publiés dans le dépôt public GitHub :

- Dépôt : https://github.com/Mesrine67/fxmpOS
- Manifeste : https://github.com/Mesrine67/fxmpOS/releases/latest/download/latest.json
- Workflow : .github/workflows/release.yml

Le dépôt public permet aux installations de FXMP OS de récupérer les versions sans jeton d'accès. Le dépôt contient le code source et les releases. Aucun backend Next.js ou Traefik local n'est nécessaire pour ce canal.

La clé publique Minisign est intégrée à src-tauri/tauri.conf.json. Tauri vérifie la signature de chaque paquet avant de l'installer. `requireSignedVersion` est activé : la version publiée dans `latest.json` doit aussi être présente dans le commentaire de confiance signé du paquet. Les rétrogradations sont désactivées explicitement avec `allowDowngrades: false`. Une signature ou une version qui ne correspond pas bloque l'installation.

## Clés

La clé privée de développement est conservée hors du dépôt, dans le dossier voisin `tauri_updater_backend/keys/fxmpOS_dev.key`.

La clé publique correspondante est dans le fichier fxmpOS_dev.key.pub et dans la configuration Tauri. Le workflow GitHub lit la clé privée via le secret du dépôt TAURI_SIGNING_PRIVATE_KEY. La clé actuelle n'a pas de mot de passe; elle est réservée au canal de développement. Ne jamais ajouter le fichier .key, l'imprimer dans un journal ou l'envoyer à un dépôt.

Sauvegarder la clé privée dans un gestionnaire de secrets privé. Si elle est perdue, les installations existantes ne peuvent plus accepter les futures mises à jour signées par cette clé. Pour une diffusion stable, créer et sauvegarder une clé de production distincte avant la première release publique stable, puis remplacer la clé publique intégrée et le secret GitHub en même temps. Le CLI Tauri doit être en version 2.12.0 ou supérieure afin d'inclure la version de l'application dans la signature. Les paquets plus anciens dont la signature ne contient pas cette version seront refusés par cette configuration et devront être reconstruits et signés.

## Publier une version

La version actuelle est 0.0.1. Pour amorcer le canal, pousser le tag v0.0.1; le workflow crée la première release brouillon et son latest.json. Pour les versions suivantes :

1. Incrémenter la même version SemVer dans package.json, src-tauri/tauri.conf.json et src-tauri/Cargo.toml. Le workflow vérifie ces trois valeurs et le tag. Mettre à jour Cargo.lock avec cargo check si nécessaire.
2. Committer et pousser les changements sur main.
3. Créer un tag correspondant exactement à la version, par exemple v0.0.2, puis le pousser. Le workflow démarre sur les tags v*.
4. GitHub Actions construit Windows (NSIS et MSI), macOS et Linux, signe les paquets Tauri avec Minisign et crée ou actualise latest.json. Avant vérification, le job final convertit les URLs REST de téléchargement générées par `tauri-action` en URLs navigateur `/releases/download/` utilisables par le plugin updater par défaut, puis vérifie le manifeste, les signatures et les sommes SHA-256. Le build Windows ajoute aussi un exécutable autonome expérimental; ce n'est pas un mode portable officiellement pris en charge par Tauri et il nécessite le runtime WebView2.
5. Le job `validate-release-source` refuse un tag qui ne correspond pas à la version Tauri et marque automatiquement les versions SemVer préliminaires comme préliminaires GitHub. Une exécution manuelle doit partir de la branche par défaut. Le job `verify-updater-release` confirme avec l'API GitHub que chaque URL navigateur du manifeste correspond à un actif de la release brouillon attendue, puis télécharge et vérifie chaque paquet dans des fichiers temporaires à noms fixes. Il contrôle la signature Minisign avec la clé publique intégrée et exige que le commentaire de confiance signé contienne la même version que le manifeste. Enfin, il calcule les SHA-256 des autres artefacts et ajoute `SHA256SUMS.txt` à la release.
6. Quand tous les jobs sont verts, vérifier le brouillon, le statut de signature système des installateurs et les sommes SHA-256, puis publier la release GitHub manuellement. Les clients consultent uniquement la dernière release publiée; une release qui échoue à la validation reste en brouillon.

## Secrets GitHub Actions

Les signatures Minisign du système updater et les signatures reconnues par Windows/macOS sont différentes. Le workflow ne peut créer aucun certificat : configurez ces secrets dans **Settings → Secrets and variables → Actions** du dépôt avant une diffusion publique.

| Secret                               | Usage                                                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | Clé privée Minisign; nécessaire pour créer les signatures updater.                                                                                             |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Mot de passe de cette clé; vide pour la clé de développement actuelle.                                                                                         |
| `WINDOWS_CERTIFICATE`                | Certificat Authenticode Windows `.pfx` encodé en Base64. Le workflow l'importe temporairement dans le magasin du runner et retire le fichier PFX après import. |
| `WINDOWS_CERTIFICATE_PASSWORD`       | Mot de passe du PFX Windows.                                                                                                                                   |
| `APPLE_CERTIFICATE`                  | Certificat Developer ID Apple exporté en Base64 pour signer les builds macOS.                                                                                  |
| `APPLE_CERTIFICATE_PASSWORD`         | Mot de passe du certificat Apple exporté.                                                                                                                      |
| `APPLE_SIGNING_IDENTITY`             | Identité Developer ID correspondant au certificat.                                                                                                             |
| `APPLE_ID`                           | Compte Apple utilisé pour notariser l'application.                                                                                                             |
| `APPLE_PASSWORD`                     | Mot de passe spécifique à l'application Apple pour la notarisation.                                                                                            |
| `APPLE_TEAM_ID`                      | Identifiant de l'équipe Apple associée au compte.                                                                                                              |

Sans `WINDOWS_CERTIFICATE`, les installateurs Windows n'ont pas de signature Authenticode. Sans certificat Developer ID et identifiants Apple, les builds macOS restent signés ad hoc et ne sont pas notariés. La signature Minisign de l'updater peut rester valide dans ces deux cas; elle ne supprime pas les avertissements de sécurité du système. Le résumé Actions indique si la signature système et la notarisation étaient configurées; les identifiants Apple ne sont transmis au build que lorsque tous sont présents.

Toutes les GitHub Actions sont épinglées sur un SHA complet. Dependabot vérifie chaque semaine les mises à jour de ces références.

Le workflow CI vérifie le typage et le build Next.js, puis le formatage et la compilation Rust sur Linux, Windows et macOS. Un job distinct vérifie la compilation avec le MSRV déclaré, Rust 1.95. Ces contrôles s'exécutent pour les PR et les pushes sur `main`.

Pour amorcer le canal, dans PowerShell depuis la racine du dépôt :

    git tag v0.0.1
    git push origin v0.0.1

Pour la version suivante :

    git tag v0.0.2
    git push origin v0.0.2

Le premier manifeste ne sera visible aux clients qu'après la publication de la première release. Avant cela, le bouton de vérification peut afficher une erreur 404 du dépôt.

## Utilisation dans FXMP OS

Ouvrir Settings puis cliquer sur Vérifier maintenant. Si une version est disponible, FXMP OS affiche sa version et ses notes. Télécharger et installer demande un clic explicite. Tauri vérifie la signature avec la clé publique embarquée, puis installe la version et redémarre l'application.

Le serveur de développement `pnpm tauri dev` n'est pas une installation distribuée et ne doit pas servir à valider le remplacement d'un binaire installé. Les détails Account sont lus localement; aucun identifiant ou clé privée ne doit passer par la WebView.

## Compiler localement un paquet signé

Dans PowerShell, définir la clé dans l'environnement du processus avant le build :

    $keyPath = (Resolve-Path -LiteralPath "..\tauri_updater_backend\keys\fxmpOS_dev.key").Path
    $env:TAURI_SIGNING_PRIVATE_KEY = $keyPath
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
    pnpm tauri build

Le build écrit les installateurs et les fichiers de signature sous `src-tauri/target/release/bundle/`. Ne pas publier de release avant d'avoir vérifié le manifeste, la signature Minisign, le statut de signature système des installateurs et les sommes de contrôle.
