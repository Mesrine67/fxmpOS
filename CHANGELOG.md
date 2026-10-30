# Journal des modifications

## [0.0.46] - 2026-10-30

### Améliorations

- Refonte le dock en panneau d’accès rapide Windows avec une grille 3 × 3, des icônes de dossiers et de fichiers et le matériau Acrylic natif.
- Ajoute les thèmes Windows, FXMP et Clair dans Paramètres → Dock, avec mémorisation locale du choix.

## [0.0.45] - 2026-10-30

### Améliorations

- Ajoute un dock FXMP OS flottant, accessible depuis le menu Tray et personnalisable avec un raccourci clavier global.
- Ajoute une page Raccourcis clavier avec recherche et raccourcis utiles pour naviguer dans l’application.
- Ajoute des raccourcis de navigation locaux pour les pages principales et les paramètres.

## [0.0.44] - 2026-10-30

### Améliorations

- Remplace le flyout WebView par le menu contextuel natif Windows fourni par Tauri `tray-icon`.
- Le menu natif donne accès à la Vue d’ensemble, aux Ressources, aux Applications, à l’Appareil, aux Paramètres, à À propos et à Quitter.
- Le clic gauche affiche ou masque la fenêtre principale; le clic droit ouvre le menu système Windows.

## [0.0.43] - 2026-10-29

### Améliorations

- Remplace le menu Tray système par un flyout FXMP OS dédié, inspiré du panneau compagnon OpenClaw sous Windows.
- Le clic gauche bascule la fenêtre principale ; le clic droit ouvre ou ferme le flyout près de l’icône Tray.
- Ajoute des raccourcis vers les pages principales, les paramètres et les informations FXMP OS, avec une action pour quitter l’application.
- Ajoute une capability Tauri dédiée au flyout et documente le comportement attendu du Tray.

## [0.0.42] - 2026-10-29

### Améliorations

- Restaure le menu natif Windows de la zone de notification avec les commandes FXMP OS directement accessibles.
- Le clic droit ouvre le menu natif ; le clic gauche affiche ou masque la fenêtre principale.
- Supprime le panneau tray HTML, sa fenêtre WebView dédiée, ses styles et sa capability Tauri.
- Les commandes du menu natif ouvrent les pages autorisées et proposent une action explicite pour quitter FXMP OS.

## [0.0.41] - 2026-10-28

### Améliorations

- Remplace le menu système du tray par un flyout FXMP OS compact, translucide et ancré près de l’icône, avec des accès rapides, les paramètres, la page À propos et une action Quitter.
- Le clic droit ouvre ou ferme le flyout ; les raccourcis naviguent vers les pages autorisées, tandis que le clic gauche continue d’afficher ou de masquer la fenêtre principale.
- Isole le panneau tray dans une fenêtre Tauri dédiée et limitée à ses permissions nécessaires ; son fond Acrylic suit le style du compagnon OpenClaw sous Windows.
- Charge les informations locales du profil à l’ouverture du menu utilisateur afin d’éviter un chargement inutile au démarrage.

## [0.0.40] - 2026-10-28

### Correctifs

- Le setup NSIS peut maintenant fermer FXMP OS lorsqu'une mise à niveau ou une désinstallation est demandée par Windows Restart Manager. La fermeture normale de la fenêtre continue de masquer l'application dans la zone de notification.

## [0.0.39] - 2026-10-28

### Améliorations

- Ajoute un dock FXMP OS flottant, accessible depuis le menu Tray et personnalisable avec un raccourci clavier global.
- Ajoute une page Raccourcis clavier avec recherche et raccourcis utiles pour naviguer dans l’application.
- Ajoute des raccourcis de navigation locaux pour les pages principales et les paramètres.

## [0.0.38] - 2026-10-28

### Améliorations

- Le menu natif de la zone de notification donne accès au centre de contrôle, aux pages Vue d’ensemble, Ressources, Applications et Appareil, ainsi qu’aux catégories de paramètres.
- Les raccourcis du tray affichent la fenêtre et ouvrent la page ou l’onglet demandé; le clic gauche continue d’ouvrir ou de masquer FXMP OS.
- La page À propos présente la version installée, la cible Windows et les informations de confidentialité locales.
- Le menu Windows propose une action explicite pour ouvrir FXMP OS et une autre pour quitter complètement l’application.

## [0.0.37] - 2026-10-27

### Publication corrective

- Cette version reprend les améliorations de notifications publiées en `0.0.36` sous le numéro de version attendu `0.0.37`.
- Les notifications Sonner dans FXMP OS et les notifications système Windows via `tauri-plugin-notification` restent indépendantes et peuvent fonctionner simultanément.
- La correction CSP conserve les toasts Sonner visibles dans WebView2, et le canal Windows fonctionne aussi lorsque FXMP OS est au premier plan.
- Aucun changement fonctionnel supplémentaire n’est introduit par cette republication.

## [0.0.36] - 2026-10-27

### Améliorations

- Les notifications intégrées Sonner et les notifications système Windows via `tauri-plugin-notification` sont maintenant deux canaux indépendants. Quand les deux options sont activées, un événement au premier plan peut apparaître dans l’application et dans Windows.
- Les paramètres distinguent clairement l’aperçu Sonner du test natif Windows; le résultat du test natif indique que Tauri a accepté l’envoi sans prétendre que Windows l’a affiché.
- Les aperçus Sonner respectent le réglage des notifications dans FXMP OS.

### Corrections

- Les toasts Sonner restent visibles dans la fenêtre Tauri avec la CSP stricte : leurs styles sont inclus dans la feuille CSS empaquetée au lieu de dépendre d’un bloc `<style>` injecté et bloqué par WebView2.
- Le canal Windows n’est plus ignoré lorsque la fenêtre FXMP OS est au premier plan.

## [0.0.35] - 2026-10-27

### Améliorations

- Les notifications Sonner de FXMP OS restent visibles au-dessus du contenu de la fenêtre; leur conteneur n’est plus rogné par la zone principale de l’application.

## [0.0.34] - 2026-10-27

### Améliorations

- Le panneau Thème utilise des classes Tailwind complètes pour les cinq couleurs de l’aperçu graphique; la palette choisie reste visible après compilation.
- Les réglages Notifications séparent maintenant les aperçus Sonner dans FXMP OS des essais de notifications natives envoyées par le plugin Tauri.
- Les essais natifs proposent des exemples Succès, Information, Attention et Erreur avec des titres et textes distincts; chaque échec affiche son message dans les réglages.
- Les réglages précisent que Windows contrôle l’apparence native et que le plugin Tauri nécessite une application installée pour utiliser son identité FXMP OS.

### Sécurité et confidentialité

- Aucun nouveau droit Tauri ni donnée système n’est ajouté; les notifications de test utilisent uniquement des textes fixes de démonstration.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.33] - 2026-10-27

### Améliorations

- Les réglages Thème proposent les huit styles Vega, Nova, Maia, Lyra, Mira, Luma, Sera et Rhea ainsi que les bases Neutral, Stone, Zinc, Mauve, Olive, Mist et Taupe.
- Les palettes de thème et de graphiques reprennent les choix de shadcn Create, dont Neutral, Amber, Blue, Cyan, Emerald, Fuchsia, Green, Indigo, Lime, Orange, Pink, Purple, Red, Rose, Sky, Teal, Violet et Yellow.
- Les styles, surfaces de base, accents, graphiques et polices agissent sur les composants shadcn et l’aperçu en direct; les préférences restent synchronisées dans le store Tauri.
- Inter est intégré au bundle de l’application au lieu de dépendre de sa présence sur le PC.

### Sécurité et confidentialité

- Les préférences visuelles restent locales dans `themePreferences`; aucun nouveau droit Tauri ni stockage WebView n’est ajouté.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.32] - 2026-10-27

### Améliorations

- Le bouton utilisateur représente maintenant clairement l’appareil Windows et la session locale, avec le nom de l’utilisateur et de l’ordinateur.
- Le menu de profil s’ouvre au-dessus du bouton, reste dans la largeur du sidebar et utilise un fond opaque cohérent avec le thème.
- Les informations locales du PC sont chargées dès le démarrage de l’application; le menu affiche le système, l’architecture, le processeur et la mémoire vive lorsqu’ils sont disponibles.
- Le menu reste utilisable pendant le chargement ou si la lecture locale échoue, et propose des accès directs à Compte et appareil et aux Paramètres.

### Sécurité et confidentialité

- Le menu n’affiche aucun e-mail d’exemple, chemin de profil, secret ni identifiant de compte en ligne.
- Les informations présentées proviennent de la commande locale `get_system_snapshot` et ne sont pas envoyées à un service distant.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.31] - 2026-10-27

### Améliorations

- Une catégorie Thème permet de choisir l’apparence système/clair/sombre, les styles Mira/Nova, la base de couleur, les accents, les palettes de graphiques, les polices et le rayon des composants.
- Les choix du thème modifient les tokens CSS shadcn utilisés par l’application, sont prévisualisés directement dans les réglages et partagés entre fenêtres via le store Tauri.
- La fenêtre de mise à jour présente l’étape de téléchargement, sa progression et les données de taille disponibles, puis propose l’installation et le redémarrage comme action distincte.
- Les installateurs et le désinstalleur NSIS reprennent maintenant l’identité visuelle FXMP OS; le bundle MSI reçoit aussi ses visuels WiX.

### Sécurité et confidentialité

- L’audit des capacités Windows confirme que l’application n’a pas besoin d’élévation et que cette version n’ajoute aucune permission Tauri.
- Les préférences de thème restent locales dans le store Tauri; aucun profil ou réglage n’est envoyé à un service distant.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- NSIS installe pour l’utilisateur courant sans élévation. Le MSI WiX généré utilise une portée par machine et peut demander l’élévation UAC; voir `UPDATE.md`.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.30] - 2026-10-27

### Améliorations

- Les notifications FXMP OS utilisent Sonner dans l’application et le plugin officiel Tauri pour les notifications natives Windows en arrière-plan.
- Une catégorie Notifications permet d’activer chaque canal, de choisir la position et la durée des toasts, et d’afficher ou non le bouton de fermeture.
- L’autorisation Windows est demandée uniquement après une action explicite dans les réglages; une section de test prévisualise les niveaux de toast et la notification native.
- Les préférences de notification sont partagées localement par le store Tauri. Les alertes natives restent désactivées par défaut et n’incluent aucune donnée système personnelle.

Chaque version publiée possède sa propre section. Le workflow de release réutilise ces notes dans la release GitHub et dans le manifeste de l’updater Tauri.

## [0.0.29] - 2026-10-27

### Améliorations

- La barre latérale propose trois espaces de travail dédiés : OS, Overlays et Games.
- Le menu de l’espace reprend le sélecteur shadcn avec sélection clavier et persiste le choix localement dans le store Tauri.
- Les formulaires GitHub de documentation et de support sont adaptés à FXMP OS et renvoient vers les releases et le signalement privé des vulnérabilités.
- `pnpm version:bump -- patch` synchronise les versions package/Tauri/Cargo et ajoute une section à compléter au journal des modifications.
- `scripts/build-jooat-resolver-pack.mjs` transforme une liste locale de noms en un pack JOAAT découpé en shards.
- Chaque espace affiche uniquement sa navigation; l’espace Overlays donne un accès direct aux réglages du widget.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.28] - 2026-10-27

### Corrections

- Le bouton Games indique maintenant uniquement que le groupe est déplié. Seule la sous-page courante reçoit l’état visuel sélectionné, pour éviter l’apparence de deux éléments actifs dans la barre latérale.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.27] - 2026-10-27

### Améliorations

- La barre latérale accueille un menu Games dépliable avec trois sous-entrées : localhost, app games list et settings.
- Chaque entrée dispose d’une page interne dédiée et le lien actif est mis en évidence. Le menu est ouvert par défaut et utilisable au clavier.
- Les pages Games préparent l’espace pour les futures fonctions de serveurs locaux, bibliothèque et réglages; elles proposent pour le moment des raccourcis vers les fonctions existantes de FXMP OS.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.26] - 2026-10-27

### Améliorations

- Les graphiques CPU et mémoire adaptent maintenant leur échelle aux mesures visibles pour rendre les variations récentes plus lisibles; la plage reste toujours exprimée en pourcentage.
- Les infobulles des graphiques disposent d’un repère de survol plus visible et d’un indicateur coloré cohérent avec la série affichée.
- L’inventaire Microsoft Store/MSIX s’appuie désormais sur les entrées d’applications déclarées par Windows et masque les paquets optionnels, de support ou sans application lançable.
- Les applications empaquetées utilisent leur nom et leur logo Windows; chaque entrée lançable est comptée séparément.
- Le tableau des applications garde une largeur minimale lisible et peut défiler horizontalement sur les fenêtres étroites.

### Confidentialité

- L’inventaire reste en lecture seule et local. Les identifiants Windows des applications empaquetées restent dans le backend et ne sont pas transmis à l’interface.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.25] - 2026-10-27

### Améliorations

- La page Applications détecte maintenant les paquets Microsoft Store et MSIX installés pour l’utilisateur Windows courant, en plus des logiciels de bureau inscrits dans le registre.
- Les cartes et la liste indiquent l’origine de chaque entrée; un filtre permet d’isoler les logiciels de bureau ou les paquets Store/MSIX.
- Les erreurs d’accès à une source sont visibles sans masquer les résultats de l’autre source.

### Confidentialité

- L’inventaire Store/MSIX reste local et en lecture seule; aucun identifiant de paquet, chemin ou commande de désinstallation n’est renvoyé à l’interface.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.24] - 2026-10-27

### Améliorations

- La page Applications affiche maintenant les icônes déclarées par les logiciels dans Windows, en vue liste et en grille.
- Les icônes sont extraites localement et converties en images intégrées; les chemins des exécutables ne quittent pas le backend natif.
- Une icône générique reste affichée lorsqu’un logiciel ne fournit pas d’icône exploitable.

## [0.0.23] - 2026-10-27

### Corrections

- La page Ressources n’essaie plus de construire les graphiques temporels avant le premier échantillon local.
- Les axes et infobulles ignorent les dates absentes ou invalides, afin qu’une mesure transitoire ne fasse plus échouer tout l’affichage.

## [0.0.22] - 2026-10-27

### Améliorations

- L’accueil affiche maintenant les mesures locales CPU, mémoire et réseau en direct, actualisées toutes les 10 secondes uniquement lorsque la page est visible.
- L’historique CPU et mémoire de la page Ressources couvre désormais jusqu’à 7 jours de moyennes par minute, avec une synthèse des moyennes et des pics sur la période choisie.
- La page Ressources visualise les débits de réception et d’envoi avec des courbes interactives limitées à la session en cours.

### Confidentialité

- L’historique persistant ne contient toujours que les moyennes CPU et mémoire; les processus, PID, ports, adresses et débits réseau ne sont pas conservés.

### Compatibilité

- Windows x64, installateurs NSIS et MSI. WebView2 est requis.
- macOS, Linux, Android et iOS ne sont pas distribués pour cette version.

## [0.0.21] - 2026-10-27

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
