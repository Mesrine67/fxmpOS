# Journal des modifications

Chaque version publiée possède sa propre section. Le workflow de release réutilise ces notes dans la release GitHub et dans le manifeste de l’updater Tauri.

## En préparation

### Améliorations

- Le moniteur Ressources affiche la charge de chaque processeur logique, le temps de fonctionnement Windows et les débits agrégés de réception et d’envoi mesurés localement.
- Le tableau des processus propose une pagination et un choix de 15, 25 ou 50 lignes, tout en conservant la limite des 50 processus les plus actifs et les seules colonnes autorisées.
- Les débits réseau ne sont ni enregistrés dans l’historique ni transmis; la première lecture reste vide jusqu’à l’échantillon suivant.

## [0.0.20] - 2026-10-27

### Maintenance

- Regroupe les mises à jour de maintenance destinées à la version précédente, dont Next.js 16.4.3, Lucide 1.61.0, shadcn 4.22.1, Tauri 2.12.5 et tauri-build 2.7.4.
- Corrige l'autorisation GitHub Actions du SHA de `Swatinem/rust-cache` pour que la publication Windows puisse démarrer sous la politique d'actions autorisées du dépôt.
- Les builds frontend, Windows, MSRV Rust et CodeQL ont passé leurs contrôles sur les PR correspondantes.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.19] - 2026-10-27

### Maintenance

- Mise à jour de Next.js et de sa configuration ESLint vers 16.4.3, de Lucide vers 1.61.0 et de shadcn vers 4.22.1.
- Mise à jour de Tauri et tauri-build vers 2.12.5 et 2.7.4, ainsi que de la CLI Tauri vers 2.12.4.
- Mise à jour de l’action GitHub de cache Rust vers 2.9.3.
- Build frontend, compilation Windows, MSRV Rust et CodeQL vérifiés sur les PR de dépendances fusionnées.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.18] - 2026-10-27

### Améliorations

- La page Applications propose une vue liste ou grille, un filtre par portée d’installation et un tri par nom, taille déclarée ou date.
- La recherche couvre le nom, l’éditeur et la version; les résultats et filtres sont présentés dans une table shadcn accessible.
- Les métadonnées manquantes et les limites des tailles déclarées sont mieux explicitées; la page reste strictement en lecture seule.

### Corrections

- La page Ressources dispose d’un écran de reprise avec une référence d’erreur locale si son segment plante.
- Les lectures des endpoints réseau ne se chevauchent plus et sont suspendues pendant la pause.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.17] - 2026-10-25

### Améliorations

- Le moniteur affiche la charge GPU mesurée par les compteurs de performances intégrés à Windows, ventilée par adaptateur lorsqu’elle est disponible.
- Les graphiques CPU et mémoire proposent les périodes 1 minute, 1 heure et 24 heures; les moyennes par minute sont conservées localement dans le dossier de données FXMP OS.
- L’historique persistant est limité à 24 heures et ne contient que des métriques CPU et mémoire; les processus, PID, ports et adresses réseau ne sont pas historisés.

### Compatibilité et limites

- La mesure GPU dépend de la disponibilité des compteurs de moteurs GPU Windows et n’affiche pas de température.
- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.16] - 2026-10-25

### Améliorations

- Ajout de l’onglet Ports réseau au moniteur, avec filtres TCP, UDP et ports à l’écoute, recherche et tableaux lisibles.
- Lecture native locale des endpoints TCP/UDP IPv4 et IPv6 et association au PID et au nom de processus lorsque Windows les rend accessibles.
- Actualisation des ports toutes les cinq secondes, séparée des mesures CPU/mémoire et suspendue lorsque la page est masquée ou en pause.

### Confidentialité et compatibilité

- Lecture IP Helper Windows en observation seule; aucune commande shell, capture de paquets, résolution DNS, modification du pare-feu ou arrêt de processus.
- Les adresses locales et distantes restent affichées uniquement dans l’application et ne sont jamais transmises.
- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.15] - 2026-10-25

### Améliorations

- Ajout d’une page Moniteur de ressources avec courbes CPU et mémoire actualisées toutes les deux secondes et historique de la dernière minute.
- Ajout d’une liste des 50 processus les plus consommateurs, avec recherche et tri par nom, utilisation CPU ou mémoire.
- Ajout d’une commande native locale en lecture seule; aucune ligne de commande ou chemin d’exécutable n’est exposé.
- La liste des processus couvre les 25 principaux consommateurs CPU et mémoire, et le CPU des processus utilise la même échelle globale 0–100 % que le graphique système.
- Documentation des champs de processus et de la permission limitée à la fenêtre principale dans les pratiques de sécurité du dépôt.
- Ajout d’un accès au moniteur depuis le menu latéral et le centre de contrôle PC.

### Confidentialité et compatibilité

- Les échantillons ne sont conservés qu’en mémoire pendant l’affichage de la page, et la lecture s’interrompt lorsque la fenêtre est masquée.
- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.14] - 2026-10-24

### Corrections

- Le raccourci de mise à jour reste dans l’en-tête du sidebar, aligné avec le nom de l’application, au lieu d’occuper une ligne isolée sous la navigation.
- L’icône et son indicateur d’état restent visibles et accessibles dans le sidebar.
- Les liens vers l’accueil, les applications, l’appareil et les paramètres gardent leur espacement et leur état actif.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.13] - 2026-10-24

### Améliorations

- La page d’accueil devient un centre de contrôle PC avec le nom de l’appareil, la version Windows, le processeur, la mémoire, les volumes, les écrans, le GPU et le temps de fonctionnement réellement lus sur Windows.
- Les alertes de mémoire et d’espace disque sont calculées depuis les mesures locales; aucun graphique de démonstration ni aucune statistique fictive n’est présenté comme une donnée réelle.
- La navigation latérale est recentrée sur l’accueil, les applications, l’appareil et les paramètres; l’ancienne route `/dashboard` redirige vers l’accueil.
- Le menu de profil affiche le compte Windows local et un résumé du PC. Les informations sont lues à l’ouverture du menu et ne comprennent ni adresse e-mail, ni chemin de profil, ni identifiant de connexion.
- Des raccourcis donnent accès aux applications installées, aux détails de l’appareil et aux réglages de l’overlay.

### Confidentialité et compatibilité

- Les informations utilisées par l’accueil et le menu restent locales et réutilisent la commande système en lecture seule existante.
- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.12] - 2026-10-24

### Améliorations

- Les notes de version s’ouvrent dans une fenêtre dédiée et défilable depuis Paramètres, l’historique et le raccourci latéral.
- Le téléchargement est une étape distincte de l’installation, avec progression, quantité téléchargée et état prêt à installer.
- Après le téléchargement signé, l’utilisateur choisit quand installer et redémarrer FXMP OS.
- Les permissions updater Tauri autorisent explicitement les commandes séparées de téléchargement et d’installation dans la fenêtre principale.

### Sécurité et fiabilité

- La validation Minisign de Tauri est conservée avant installation; aucun téléchargement ou installation automatique n’est lancé sans action de l’utilisateur.
- Les vérifications périodiques ne remplacent pas l’objet d’update pendant le téléchargement ou lorsqu’il est prêt à installer.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.11] - 2026-10-24

### Améliorations

- La recherche de mises à jour démarre dès que la fenêtre principale est prête, sans délai artificiel ni second contrôle depuis la page Paramètres.
- FXMP OS vérifie les versions au démarrage, au retour au premier plan et toutes les minutes tant que la fenêtre principale est visible.
- La barre latérale et la page Paramètres partagent le même état, le même changelog et le même téléchargement signé.

### Sécurité et confidentialité

- Seule la fenêtre principale interroge le manifeste GitHub; l’overlay ne lance pas de vérification supplémentaire.
- Les mises à jour restent vérifiées par signature Minisign et l’installation nécessite toujours une action de l’utilisateur.
- Aucune donnée système n’est ajoutée aux requêtes de mise à jour.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.10] - 2026-10-24

### Améliorations

- La page Compte signale les volumes dont l’espace libre est inférieur à 5 %, avec leur espace disponible et un accès direct à leur détail.
- Chaque volume affiche désormais son espace libre en Go et en pourcentage, avec un indicateur visuel d’espace faible.
- Les jauges de mémoire vive, mémoire virtuelle et stockage utilisent le composant shadcn Progress.

### Confidentialité

- Ces informations utilisent la lecture locale existante de Windows; aucune permission ni transmission réseau supplémentaire n’est ajoutée.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.9] - 2026-10-24

### Améliorations

- L’historique des releases propose une sélection au clavier et à la souris, avec une ligne entière cliquable et un état de sélection visible.
- Les colonnes Version, Publication, Fichiers et Téléchargements peuvent être triées dans les deux sens.
- La recherche et la pagination affichent les versions par pages de 10, 25 ou 50 entrées.
- Le changelog et les fichiers d’une release sont organisés dans des onglets; les empreintes SHA-256 restent accessibles pour chaque fichier.
- La recherche, les états vides et les erreurs utilisent les composants shadcn correspondants; les contrôles restent accessibles avec un lecteur d’écran.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.8] - 2026-10-24

### Améliorations

- Les infobulles des actions icônes de la barre latérale utilisent maintenant le composant shadcn Base UI, avec le même style, positionnement et comportement clavier/souris.
- Le bouton de mise à jour affiche son état dynamique dans une infobulle accessible, sans infobulle native HTML.

## [0.0.7] - 2026-10-23

### Améliorations

- Les préférences durables de l’overlay sont maintenant enregistrées dans le store Tauri du dossier de données FXMP OS et partagées entre les fenêtres.
- L’activation, l’écran, l’ancrage, la position physique, l’opacité et les options d’affichage sont restaurés depuis ce store.
- Au premier lancement de cette version, les anciennes préférences d’overlay sont migrées automatiquement depuis le stockage WebView puis supprimées après sauvegarde réussie.

### Sécurité et confidentialité

- Les fenêtres n’obtiennent que les permissions Tauri Store de chargement, lecture, écriture et sauvegarde; aucune permission de suppression ou d’énumération n’est accordée.
- Le panneau de debug conserve son état temporaire pour la session uniquement; aucun secret ou identifiant de compte n’est stocké dans ce store.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.6] - 2026-10-23

### Ajouts

- Un bouton de mise à jour est accessible directement depuis la barre latérale, à côté des actions rapides.
- L’indicateur signale une nouvelle version stable et ouvre ses notes de version, sa date de publication et sa page GitHub.
- Le téléchargement signé affiche sa progression et redémarre FXMP OS lorsque l’installation Tauri est terminée.

### Sécurité et confidentialité

- La détection et l'installation utilisent l'updater Tauri signé déjà configuré. Aucune donnée système n'est transmise pour vérifier une mise à jour.
- Le bouton n’apparaît que dans l’application de bureau Tauri; le comportement de la page Web reste inchangé.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.5] - 2026-10-19

### Ajouts

- L’onglet Mises à jour affiche l’historique des releases stables publiées, avec recherche par version et contenu.
- Chaque version affiche son changelog complet, sa date, ses fichiers, leur taille, le nombre de téléchargements et leurs empreintes SHA-256 quand GitHub les fournit.
- Les fichiers des anciennes releases peuvent être ouverts depuis leur page GitHub; les brouillons et versions de prépublication ne sont pas inclus.

### Sécurité et confidentialité

- L’historique est lu publiquement depuis l’API GitHub sans authentification. Aucune information du PC n’est envoyée; l’installation continue de passer par l’updater Tauri et sa signature Minisign obligatoire.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.4] - 2026-10-19

### Ajouts

- La position manuelle de l’overlay est mémorisée en coordonnées physiques avec l’écran choisi, puis restaurée au prochain affichage. Si l’écran n’est plus disponible, l’overlay revient à l’ancrage configuré sur l’écran principal.
- Une mesure réseau manuelle et bornée affiche la latence TCP, la médiane, la variation et les pertes, avec une cible fixe. Ce résultat n’est pas un ping ICMP.
- La page Compte affiche davantage de détails sur la session Windows active, en plus du matériel, des volumes et des écrans détectés.
- La page Applications permet de rechercher les logiciels de bureau inscrits dans le registre de désinstallation Windows, leur version, éditeur, date et taille déclarées.
- La section Mises à jour affiche la version proposée, sa date, les notes de version, la cible Windows x64 et les règles de signature et d’installation.

### Sécurité et confidentialité

- La liste des applications et les informations de session sont lues localement. Aucun chemin d’installation, commande de désinstallation, mot de passe ou jeton n’est exposé.
- Les mises à jour Tauri exigent une signature valide et refusent les versions antérieures. Les releases distribuées par l’updater sont destinées à Windows x64.
- L’overlay ne lance aucune sonde réseau et continue de ne lire que la mémoire vive et le nom de l’hôte.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. Le runtime Microsoft Edge WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.
