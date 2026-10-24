# Mises à jour Tauri — FXMP OS

## Canal de distribution

- Dépôt GitHub : https://github.com/Mesrine67/fxmpOS
- Manifeste updater : https://github.com/Mesrine67/fxmpOS/releases/latest/download/latest.json
- Workflow : `.github/workflows/release.yml`

Les nouvelles versions distribuées sont uniquement pour Windows, en NSIS et MSI. Les builds macOS, Linux, Android et iOS sont désactivés. La release publique `v0.0.1` a été créée avant cette restriction et conserve ses anciens assets macOS/Linux; les releases publiées ne sont pas modifiées rétroactivement.

La clé publique Minisign est intégrée à `src-tauri/tauri.conf.json`. L'updater exige une version signée (`requireSignedVersion: true`) et refuse les rétrogradations (`allowDowngrades: false`). La signature protège les mises à jour intégrées à l'app; Authenticode est une signature distincte de l'installateur Windows.

## Clés et secrets

La clé privée de développement se trouve hors du dépôt dans `tauri_updater_backend/keys/fxmpOS_dev.key`. Elle ne doit jamais être ajoutée au dépôt ni affichée dans les logs. Le workflow lit cette clé via `TAURI_SIGNING_PRIVATE_KEY`; garder sa sauvegarde dans un gestionnaire de secrets privé. Pour une diffusion stable, créer et sauvegarder une clé de production avant de remplacer simultanément la clé publique intégrée et le secret GitHub.

Le CLI Tauri doit rester en version 2.12.0 ou supérieure afin de lier la version de l'application à la signature. Toute nouvelle signature doit être vérifiée par le validateur avant la publication.

Secrets GitHub Actions utilisés :

| Secret | Usage |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | Clé privée Minisign pour signer les artefacts updater. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Mot de passe de la clé; vide pour la clé de développement actuelle. |
| `WINDOWS_CERTIFICATE` | Certificat Authenticode `.pfx` encodé en Base64. |
| `WINDOWS_CERTIFICATE_PASSWORD` | Mot de passe du certificat PFX. |

Sans le certificat Windows, les installateurs n'ont pas de signature Authenticode et peuvent afficher un avertissement SmartScreen. La signature Minisign ne supprime pas cet avertissement.

## Publier une version

Les versions de `package.json`, `src-tauri/tauri.conf.json` et `src-tauri/Cargo.toml` doivent être identiques. Pour chaque release :

1. Incrémenter ces versions avec SemVer et mettre à jour `Cargo.lock` avec `cargo check` si nécessaire.
2. Committer les changements, pousser une branche, ouvrir une PR et la fusionner dans `main` après les vérifications CI et CodeQL.
3. Vérifier que le tag et la release GitHub correspondants n'existent pas. Depuis le commit fusionné sur `main`, créer puis pousser une seule fois le tag exact, par exemple `v0.0.2`:

   ```powershell
   git switch main
   git pull --ff-only origin main
   git tag v0.0.2
   git push origin v0.0.2
   ```

4. Le push du tag lance le build Windows NSIS/MSI. Le workflow crée une release brouillon, signe les bundles avec Minisign, convertit les URLs du manifeste en URLs `/releases/download/`, vérifie le manifeste et les signatures, puis ajoute `SHA256SUMS.txt`.
5. Dans GitHub Actions, confirmer que tous les jobs ont réussi. Dans le draft, vérifier les paquets NSIS/MSI, leurs signatures `.sig`, `latest.json`, `SHA256SUMS.txt` et le statut Authenticode, puis publier la release manuellement. Les clients consultent uniquement la dernière release publiée.

La publication/build est déclenchée par un tag poussé une fois. Ne pas utiliser `workflow_dispatch` pour créer ou reconstruire une release, ne pas réutiliser un tag et ne pas retagger une version publiée. Pour corriger des artefacts déjà publiés, incrémenter la version et créer une nouvelle release.

Si un build a téléversé ses artefacts dans un draft mais que leur vérification a échoué, on peut relancer uniquement cette vérification depuis `main`. `verifyOnly` est obligatoire et doit rester à `true`; une exécution manuelle avec `false` échoue au lieu de terminer en succès sans action :

```powershell
gh workflow run release.yml `
  --repo github.com/Mesrine67/fxmpOS `
  --ref main `
  -f verifyOnly=true
```

Cette option ne reconstruit aucun paquet. Elle ne s'applique qu'à une release brouillon existante, jamais à une release publiée. Le workflow vérifie aussi que le tag correspondant existe et que son commit appartient à l'historique de `main`.

Le job de vérification confirme que les URLs de `latest.json` pointent vers les actifs de la release attendue, que seuls les formats Windows x64 NSIS/MSI sont présents, que chaque entrée updater Windows porte une signature Minisign valide liée à la version et que les sommes SHA-256 correspondent. Tout manifeste ou asset macOS/Linux/Android/iOS entraîne un échec; une release en échec reste brouillon.

## Installation Windows

Le setup NSIS installe FXMP OS pour l'utilisateur courant dans `%LOCALAPPDATA%`, sans élévation administrateur. Il suit la langue de Windows (français ou anglais), utilise l'icône FXMP OS et crée le raccourci du Menu Démarrer. Le runtime WebView2 est vérifié; le bootstrapper est téléchargé et lancé silencieusement uniquement s'il manque. Le MSI est aussi distribué.

Configurez `WINDOWS_CERTIFICATE` et `WINDOWS_CERTIFICATE_PASSWORD` pour signer les installateurs Authenticode. Ne passez pas l'installation en mode `perMachine` ou `both` sans besoin d'installation système.

## CI et publication

Le workflow CI vérifie TypeScript et le build Next.js sur un runner Linux générique, puis compile et formate le backend Rust sur Windows. Le MSRV Rust 1.95 est aussi vérifié sous Windows. Ces contrôles s'exécutent sur les PR et les pushes vers `main`.

Toutes les actions GitHub sont épinglées sur des SHA complets et Dependabot les met à jour chaque semaine. Pour diagnostiquer un échec, utiliser `gh` pour consulter le run, le job, les annotations et les logs avant de modifier le code; après correction, pousser la branche et attendre les vérifications GitHub.

## Utilisation de l'updater

FXMP OS vérifie le manifeste signé au démarrage, au retour de la fenêtre principale au premier plan et toutes les 60 secondes lorsqu'elle reste visible. La barre latérale affiche le résultat et la page **Settings** partage ce même contrôle. L'utilisateur peut lancer **Vérifier maintenant**, démarrer le téléchargement, suivre sa progression, puis choisir **Installer et redémarrer**. Les notes complètes s'ouvrent dans une fenêtre dédiée depuis le raccourci latéral et les détails d'une release. Le handle Tauri de la mise à jour est conservé entre le téléchargement et l'installation; les contrôles périodiques sont suspendus pendant ces étapes. La vérification de signature Minisign reste obligatoire et aucune mesure locale n'est envoyée.

Le serveur `pnpm tauri dev` n'est pas une installation distribuée et ne valide pas le remplacement d'un binaire installé. Les détails Account sont lus localement; aucune clé privée ne passe dans la WebView.

## Compiler localement un paquet signé

Depuis PowerShell, avec la clé privée disponible hors dépôt :

```powershell
$keyPath = (Resolve-Path -LiteralPath "..\tauri_updater_backend\keys\fxmpOS_dev.key").Path
$env:TAURI_SIGNING_PRIVATE_KEY = $keyPath
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
pnpm tauri build
```

Les installateurs et signatures sont écrits dans `src-tauri/target/release/bundle/`. Ne pas publier avant la vérification des signatures, du manifeste et des sommes SHA-256.
