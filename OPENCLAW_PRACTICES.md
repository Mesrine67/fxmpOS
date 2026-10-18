# Pratiques OpenClaw retenues pour FXMP OS

Revue ciblée effectuée le 18 octobre 2026 sur les surfaces OpenClaw liées à l'app Linux Tauri, au Windows Hub, aux mises à jour et à la sécurité; ce n'est pas un audit ligne par ligne de tout le dépôt. FXMP OS est une application locale de monitoring; il ne partage pas le rôle de passerelle, de messagerie ou d'exécution d'agents d'OpenClaw.

## Ce que nous reprenons

| Domaine            | Choix retenu dans FXMP OS                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permissions Tauri  | Deux capacités locales et séparées : `main` configure l'overlay et lit les écrans; `overlay` ne lit que ses mesures compactes et peut se déplacer. Les commandes de collecte n'acceptent aucun chemin ou script fourni par l'interface.                                                                                                                                                                     |
| Contenu WebView    | La navigation externe est validée en Rust et les schémas non approuvés sont refusés. Les journaux n'enregistrent que l'origine ou le schéma expurgé, jamais chemin, requête ou fragment. Le CSP n'autorise que les ressources locales, les images `data:`/`blob:` et l'IPC Tauri; il ne charge pas de média distant.                                                                                     |
| Travail natif      | La collecte système et WMI s'exécutent dans le pool de tâches bloquantes afin que l'interrogation du matériel ne fige pas le thread de l'interface.                                                                                                                                                                                                                                                      |
| Cycle de vie       | L'instance unique, le démarrage masqué optionnel, le démarrage Windows facultatif et la fermeture vers la zone de notification sont explicites. `main` a `create: false` et est construite depuis sa configuration avec `WebviewWindowBuilder::from_config` dans `setup`; l'overlay garde aussi `create: false` et n'est créé qu'à la demande par une commande asynchrone. Sous Linux, la commande interroge le backend GDK réellement sélectionné sur le thread principal et refuse Wayland avant de créer la WebView, car le placement global choisi par l'overlay exige X11. Les préférences ne sont enregistrées qu'après la réussite de la commande native; si leur écriture échoue, l'interface restaure l'état natif précédent. Quitter reste une action de tray séparée. |
| Updater            | Les paquets sont signés, la version du manifeste est liée à la signature, l'utilisateur déclenche l'installation, les releases restent en brouillon après build, et une étape séparée normalise les URLs vers des téléchargements navigateur GitHub avant de vérifier les plateformes, les signatures et les sommes de contrôle.                                                                 |
| Origine de release | Un tag doit correspondre à la version Tauri. L'exécution manuelle de publication est limitée à la branche par défaut.                                                                                                                                                                                                                                                                                    |
| Vie privée         | Les détails du PC et les dimensions/positions d'écran sont lus localement. FXMP OS n'expose pas de numéros de série, EDID ou identifiants matériels uniques et ne transmet pas ces informations au manifeste de mise à jour.                                                                                                                                                                                |

## Choix OpenClaw qui ne sont pas importés

- Le Windows Hub d'OpenClaw est une application native WinUI; FXMP OS cible actuellement Windows uniquement, avec Tauri comme shell desktop. Les builds macOS/Linux restent désactivés jusqu'à décision explicite de réactivation; le changement de cible ne retire pas les dépendances Linux transitives ni l'alerte glib suivie dans l'issue #7.
- Les Gateways WSL, services gérés, connexions distantes, jumelage d'appareils, commandes d'agents, MCP et politiques multi-profils répondent aux fonctions d'assistant d'OpenClaw; FXMP OS n'a pas ces surfaces.
- Les capacités séparées sont utiles quand une app possède plusieurs WebViews de confiance différente. FXMP OS a deux fenêtres locales; chacune reçoit sa propre capacité étroite.

## Références consultées

- [OpenClaw — application desktop Linux/Tauri](https://github.com/openclaw/openclaw/blob/main/apps/linux/README.md)
- [OpenClaw — support Windows et Hub natif](https://github.com/openclaw/openclaw/blob/main/docs/platforms/windows.md)
- [OpenClaw — modèle de sécurité](https://github.com/openclaw/openclaw/blob/main/docs/gateway/security/index.md)
- [OpenClaw — configuration Tauri du compagnon Linux](https://github.com/openclaw/openclaw/blob/main/apps/linux/src-tauri/tauri.conf.json)
- [OpenClaw — création différée de la fenêtre Tauri au commit étudié](https://github.com/openclaw/openclaw/blob/9657a374ff5cb750ccb7d6a89cc715d39d8ba31e/apps/linux/src-tauri/tauri.conf.json#L570-L577)
- [Tauri — création manuelle d'une fenêtre configurée](https://v2.tauri.app/reference/config/#windowconfig)
- [Tauri — permissions et capacités](https://v2.tauri.app/security/capabilities/)
- [Tauri — CSP](https://v2.tauri.app/security/csp/)
- [Tauri — commandes asynchrones](https://v2.tauri.app/develop/calling-rust/)
