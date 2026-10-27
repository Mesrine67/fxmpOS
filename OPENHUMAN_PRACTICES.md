# Pratiques OpenHuman évaluées pour FXMP OS

Le moniteur de ressources ajoute `get_resource_sample` uniquement à la capacité `main`. Cette commande native est en lecture seule, échantillonne localement CPU, mémoire et processus, et retourne au plus 50 entrées issues de l'union des 25 processus les plus actifs en CPU et des 25 plus consommateurs de mémoire. Les seuls champs de processus autorisés sont le nom, le PID, le CPU normalisé à l'échelle machine (0–100 %) et la mémoire utilisée. Elle n'expose pas de chemin, ligne de commande, nom d'utilisateur, environnement ni contrôle des processus. Elle expose aussi la charge instantanée de chaque processeur logique, la durée depuis le dernier démarrage Windows et les débits agrégés de réception/envoi dérivés des compteurs locaux des interfaces via `sysinfo`. Aucun nom d'interface n'est exposé, et ces débits ne sont pas persistés ni envoyés.

`get_network_endpoints` est également limité à la capacité `main` et lit les tables IP Helper Windows TCP/UDP IPv4/IPv6 en observation seule. Il ne renvoie que protocole, adresses IP locales/distantes, ports, état TCP et PID; le nom du processus est joint au snapshot sysinfo local quand accessible. La WebView interroge cette commande aux cinq secondes uniquement quand la page Ressources est visible et en direct. Ne pas ajouter de capture de paquets, résolution DNS, shell, modification de pare-feu ni action d'arrêt. Les adresses restent locales à l'interface et ne sont jamais envoyées au réseau.

Les notifications de l'application utilisent Sonner au premier plan et `tauri-plugin-notification` pour les alertes Windows en arrière-plan. Seule la capacité `main` a les trois permissions minimales du plugin; l'overlay n'en reçoit aucune. La demande d'autorisation Windows suit un clic explicite dans Paramètres et les préférences sont partagées via `fxmp-settings.json`. Ne pas placer d'informations PC, de processus, de ports ou d'identifiants dans les notifications.

Revue ciblée effectuée le 18 octobre 2026 à partir du README, de `AGENTS.md`, de `SECURITY.md`, de `CONTRIBUTING.md` et de la documentation sécurité d'OpenHuman. Ce n'est pas un audit ligne par ligne du dépôt. OpenHuman est un assistant et un harnais d'agents extensible avec un cœur Rust; FXMP OS est une application Tauri locale de monitoring et de contrôle du PC. Les mécaniques propres aux agents ne sont donc pas reprises.

## Pratiques pertinentes

| Principe observé | Décision pour FXMP OS | État |
| --- | --- | --- |
| Le cœur Rust détient les règles et la logique métier; l'interface les présente. | Garder la collecte native et les validations système dans des commandes Rust typées, puis laisser React afficher/formater les résultats. | Déjà appliqué à `get_system_snapshot`. |
| Les domaines et les interfaces publiques sont organisés explicitement. | Continuer à séparer les commandes natives par domaine sous `src-tauri/src/commands/`; ne pas transformer `lib.rs` en couche métier. | Déjà appliqué. |
| La WebView reçoit uniquement les permissions dont elle a besoin. | Garder des capacités séparées pour `main` et `overlay`; accorder à l'overlay seulement ses mesures compactes et le déplacement de fenêtre. Les deux capacités n'exposent au plugin Store que `store:allow-load`, `store:allow-get`, `store:allow-set` et `store:allow-save`, utilisés pour les préférences locales partagées de l'overlay. | Appliqué dans `src-tauri/capabilities/`. |
| Les actions exécutables passent par une politique native et distinguent lecture et écriture. | Les lectures PC/écrans restent locales. La commande d'overlay ne peut afficher, masquer ou placer que cette fenêtre. Sous Linux, elle lit le backend GDK sur le thread principal et refuse le placement sous Wayland avant de construire la WebView; l'interface ne persiste le réglage qu'après validation native et restaure l'état précédent si l'écriture locale échoue. Toute future action qui modifie Windows, écrit des fichiers ou contrôle des processus devra être validée côté Rust, limitée à une cible précise et confirmée dans l'interface avant exécution lorsqu'elle peut interrompre ou détruire des données. Ne jamais exposer un shell arbitraire à la WebView. | Appliqué à l'overlay; garde-fou documenté pour les prochaines fonctions de contrôle. |
| Les secrets sont stockés dans le coffre système et expurgés des journaux. | Ne pas ajouter de coffre tant qu'aucun secret applicatif n'est stocké. Les clés de signature updater, certificats, mots de passe et identifiants de notarisation restent dans les secrets GitHub CI; ne jamais les copier dans le dépôt ou les logs. Expurger aussi chemins, requêtes et fragments des URL externes. | Les secrets de release restent hors du dépôt. |
| Les actions sensibles sont traçables après coup. | Pour toute future fonction ayant un effet de bord, journaliser l'action, son résultat et l'erreur utile sans valeur secrète ni identifiant matériel unique. | À appliquer lors de l'ajout d'actions système. |
| Le guide de contribution expose les versions et vérifications réellement utilisées. | Maintenir dans `AGENTS.md` et `README.md` les commandes PNPM, Rust et Tauri qui correspondent aux scripts du dépôt; éviter de copier la matrice de CI et les conventions de test très spécifiques d'OpenHuman. | Le dépôt documente déjà les commandes courantes. |

La sonde de latence suit aussi cette frontière d'architecture : le frontend ne choisit pas la destination, la commande Rust utilise une cible TCP fixe et des tentatives bornées, et seule la fenêtre `main` peut la déclencher.

L'historique des versions est la seule autre lecture distante de la fenêtre principale : il interroge sans authentification l'API publique GitHub pour les métadonnées et changelogs des releases. Aucune information système ou d'identité locale n'est incluse dans cette requête; l'installation reste exclusivement contrôlée par le vérificateur Tauri signé.

## Ce qui n'est pas repris

- Le cœur d'agents, l'autonomie, les appels d'outils, la mémoire, les canaux, MCP et OAuth n'apportent rien à l'écran Account ni au dashboard actuel.
- Le bus de plugins et la pile Rust en plusieurs crates de l'assistant seraient disproportionnés pour nos quelques commandes natives.
- Le serveur JSON-RPC et ses règles de jumelage ne sont pas nécessaires tant que FXMP OS ne propose pas de service distant ou d'écoute réseau.
- Le sandbox d'exécution de commandes n'est pas requis pour la collecte en lecture seule; il deviendrait pertinent seulement si FXMP OS ajoutait une exécution de code ou de commandes arbitraires.
- Aucun plugin, crate ou dépendance d'OpenHuman n'est nécessaire pour adopter ces principes.

## Références consultées

- [OpenHuman — README et architecture produit](https://github.com/tinyhumansai/openhuman)
- [OpenHuman — règles du dépôt et frontières d'architecture](https://github.com/tinyhumansai/openhuman/blob/main/AGENTS.md)
- [OpenHuman — sécurité, approbation et stockage des secrets](https://github.com/tinyhumansai/openhuman/blob/main/gitbooks/developing/architecture/security.md)
- [OpenHuman — politique de divulgation de vulnérabilités](https://github.com/tinyhumansai/openhuman/blob/main/SECURITY.md)
- [OpenHuman — configuration et vérifications de contribution](https://github.com/tinyhumansai/openhuman/blob/main/CONTRIBUTING.md)
