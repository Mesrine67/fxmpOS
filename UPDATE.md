# Mises à jour Tauri — FXMP OS

## Canal de distribution

Les paquets signés et le manifeste updater sont publiés dans le dépôt public GitHub :

- Dépôt : https://github.com/Mesrine67/fxmpOS
- Manifeste : https://github.com/Mesrine67/fxmpOS/releases/latest/download/latest.json
- Workflow : .github/workflows/release.yml

Le dépôt public permet aux installations de FXMP OS de récupérer les versions sans jeton d'accès. Le dépôt contient le code source et les releases. Aucun backend Next.js ou Traefik local n'est nécessaire pour ce canal.

La clé publique Minisign est intégrée à src-tauri/tauri.conf.json. Tauri vérifie la signature de chaque paquet avant de l'installer. Une erreur de signature bloque l'installation.

## Clés

La clé privée de développement est conservée hors du dépôt, dans le dossier voisin tauri_updater_backend/keys/fxmpOS_dev.key.

La clé publique correspondante est dans le fichier fxmpOS_dev.key.pub et dans la configuration Tauri. Le workflow GitHub lit la clé privée via le secret du dépôt TAURI_SIGNING_PRIVATE_KEY. La clé actuelle n'a pas de mot de passe; elle est réservée au canal de développement. Ne jamais ajouter le fichier .key, l'imprimer dans un journal ou l'envoyer à un dépôt.

Sauvegarder la clé privée dans un gestionnaire de secrets privé. Si elle est perdue, les installations existantes ne peuvent plus accepter les futures mises à jour signées par cette clé. Pour une diffusion stable, créer et sauvegarder une clé de production distincte avant la première release publique stable, puis remplacer la clé publique intégrée et le secret GitHub en même temps.

## Publier une version

La version actuelle est 0.0.1. Pour amorcer le canal, pousser le tag v0.0.1; le workflow crée la première release brouillon et son latest.json. Pour les versions suivantes :

1. Incrémenter la même version SemVer dans package.json, src-tauri/tauri.conf.json et src-tauri/Cargo.toml. Mettre à jour Cargo.lock avec cargo check si nécessaire.
2. Committer et pousser les changements sur main.
3. Créer un tag correspondant exactement à la version, par exemple v0.0.2, puis le pousser. Le workflow démarre sur les tags v*.
4. GitHub Actions construit Windows (NSIS et MSI), macOS et Linux, signe les paquets Tauri et crée ou actualise latest.json. Le build Windows ajoute aussi l'exécutable portable.
5. Vérifier les artefacts et le manifeste de la release brouillon, puis publier la release GitHub. Les clients consultent uniquement la dernière release publiée.

Pour amorcer le canal, dans PowerShell depuis la racine du dépôt :

    git tag v0.0.1
    git push origin v0.0.1

Pour la version suivante :

    git tag v0.0.2
    git push origin v0.0.2

Le premier manifeste n'existera qu'après une première release publiée. Avant cela, le bouton de vérification peut afficher une erreur 404 du dépôt.

## Utilisation dans FXMP OS

Ouvrir Settings puis cliquer sur Vérifier maintenant. Si une version est disponible, FXMP OS affiche sa version et ses notes. Télécharger et installer demande un clic explicite. Tauri vérifie la signature avec la clé publique embarquée, puis installe la version et redémarre l'application.

Le serveur de développement pnpm tauri dev n'est pas une installation distribuée et ne doit pas servir à valider le remplacement d'un binaire installé.

## Compiler localement un paquet signé

Dans PowerShell, définir la clé dans l'environnement du processus avant le build :

    $env:TAURI_SIGNING_PRIVATE_KEY = "..\tauri_updater_backend\keys\fxmpOS_dev.key"
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
    pnpm tauri build

Le build écrit les installateurs et les fichiers de signature sous src-tauri/target/release/bundle/. Ne pas publier de release avant d'avoir vérifié le manifeste, les signatures et l'installateur.
