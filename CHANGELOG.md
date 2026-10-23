# Journal des modifications

Chaque version publiée possède sa propre section. Le workflow de release réutilise ces notes dans la release GitHub et dans le manifeste de l’updater Tauri.

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
