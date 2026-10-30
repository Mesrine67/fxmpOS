# Revue des plugins Tauri pour FXMP OS

Revue mise à jour le 30 octobre 2026 à partir du [catalogue officiel Tauri](https://v2.tauri.app/plugin/), de sa table de compatibilité, de `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs` et des capacités Tauri. Elle distingue les plugins effectivement installés et initialisés des API intégrées et des candidats communautaires. La distribution de FXMP OS vise Windows x64; la présence d'une dépendance multiplateforme ne signifie pas que ces plateformes sont publiées.

## Plugins déjà utilisés

| Plugin | Usage dans FXMP OS |
| --- | --- |
| `autostart` | Démarrage Windows facultatif, désactivé par défaut. |
| `global-shortcut` | Enregistre le raccourci global configurable qui affiche/masque le dock FXMP OS. |
| `log` | Journaux Rust/WebView. |
| `notification` | Notifications natives Windows en arrière-plan, après activation et autorisation explicites. |
| `opener` | Ouverture contrôlée de liens externes. |
| `os` | Quelques informations OS dans la commande native système. |
| `process` | Relance après l'installation d'une mise à jour. |
| `single-instance` | Empêche plusieurs instances de l'application. |
| `updater` | Vérification et installation des mises à jour signées. |
| `store` | Préférences locales partagées (overlay, thème, notifications) et historique limité des moyennes de ressources. |

`autostart`, `single-instance`, `notification`, `store`, `global-shortcut` et les autres plugins listés sont déclarés dans Cargo et initialisés dans `src-tauri/src/lib.rs`. `autostart`, `global-shortcut` et `single-instance` sont limités aux cibles desktop dans Cargo. L'enregistrement du raccourci passe par la commande native `set_dock_shortcut`; les commandes d'enregistrement du plugin ne sont pas exposées directement à la WebView. Le tray est fourni par l'API Tauri (`tray-icon`), pas par un plugin séparé.

## Catalogue officiel examiné

Ces plugins officiels sont listés sur la page Tauri; les versions mobiles, permissions et plateformes compatibles varient selon chaque fiche.

| Plugin | Décision pour FXMP OS |
| --- | --- |
| Autostart | Déjà utilisé. |
| Barcode Scanner | Aucun scan de code requis. |
| Biometric | Aucun flux d'authentification biométrique requis. |
| Clipboard | Aucun accès au presse-papiers requis. |
| CLI | Les arguments actuels sont gérés dans Rust; aucun parseur CLI applicatif nécessaire. |
| Deep Linking | Aucun protocole d'URL applicatif requis. |
| Dialog | Pas de dialogue natif fichier actuellement. |
| File System | La collecte actuelle n'a pas besoin d'exposer un accès fichier à la WebView. |
| Geolocation | Sans rapport avec le monitoring PC. |
| Global Shortcut | Déjà utilisé pour le raccourci global du dock. |
| Haptics | Ciblé mobile; sans usage dans cette app Windows. |
| HTTP Client | Aucun client HTTP natif supplémentaire nécessaire. |
| Localhost | Aucun serveur local en production. |
| Logging | Déjà utilisé. |
| NFC | Aucun usage NFC. |
| Notifications | Déjà utilisé : Sonner pour les toasts au premier plan, `tauri-plugin-notification` pour les alertes natives en arrière-plan. Permission accordée seulement à `main`; demande utilisateur explicite; désactivé par défaut. |
| Opener | Déjà utilisé. |
| OS Information | Déjà utilisé pour les quelques détails fournis par le plugin; le relevé PC reste dans une commande Rust dédiée. |
| Persisted Scope | Aucun périmètre d'accès fichier accordé dynamiquement à persister. |
| Positioner | Inutile ici : l'API fenêtre Tauri place déjà l'overlay sur l'écran et dans la zone de travail choisie. |
| Process | Déjà utilisé. |
| Shell | Non retenu : FXMP OS n'a pas besoin d'exposer un shell à l'interface. |
| Single Instance | Déjà utilisé. |
| SQL | Aucune base de données applicative nécessaire pour les préférences actuelles. |
| Store | Déjà utilisé pour les préférences locales partagées entre fenêtres et l'historique borné des moyennes de ressources. Les permissions restent limitées à charger, lire, écrire et sauvegarder; ce n'est pas un coffre à secrets. |
| Stronghold | Aucun secret applicatif à stocker. |
| Updater | Déjà utilisé. |
| Upload | Aucun envoi de fichier requis. |
| Websocket | Aucun service temps réel distant. |
| Window State | Non nécessaire : les coordonnées physiques et l'écran géométrique de l'overlay sont conservés dans ses préférences locales, puis bornés à la zone de travail au lancement. |

La table de compatibilité de la page contient aussi les entrées `torch`, `system-tray` et `window-customization`; le tray et la personnalisation des fenêtres utilisés ici relèvent déjà des API Tauri et aucun besoin de calcul Torch n'est présent.

Les macros Rust `tauri::command`, `tauri::generate_handler!` et `tauri::generate_context!` viennent du crate Tauri déjà requis. Elles ne constituent pas un plugin à ajouter. Le CLI `@tauri-apps/cli` est déjà déclaré comme dépendance de développement dans `package.json`; aucun ajout CLI n'est requis pour le dock.

## Candidats communautaires pertinents

- `tauri-plugin-device-info` et `tauri-plugin-system-info` recouvrent une partie des informations système, mais dupliqueraient `sysinfo`, WMI et la commande Rust typée déjà en place.
- `tauri-plugin-screenshots` capture le contenu d'écrans ou de fenêtres. FXMP OS ne capture pas l'écran; l'ajouter étendrait inutilement l'accès et la surface de confidentialité.
- `tauri-plugin-desktop-underlay` place une fenêtre sous les icônes du bureau, ce qui ne correspond pas à un HUD au premier plan.
- `tauri-nspanel` cible les panneaux natifs macOS et n'est pas adapté au besoin Windows.
- `tauri-plugin-network` concerne l'information réseau, et `tauri-plugin-tracing` remplacerait/dupliquerait le besoin de journalisation actuel.
- `tauri-plugin-widgets` vise notamment les widgets mobiles; la fenêtre WebView Tauri satisfait déjà le template overlay desktop.

La détection utilise `WebviewWindow::available_monitors`, `primary_monitor`, les dimensions et `work_area`. L'overlay utilise `WindowConfig`, `WebviewWindowBuilder::from_config`, `set_position`, `set_always_on_top` et `set_ignore_cursor_events`. Aucun plugin supplémentaire n'est nécessaire pour l'écran, la fenêtre transparente, l'ancrage ou l'opacité visuelle.

## Références

- [Tauri — catalogue des fonctionnalités, plugins et ressources communautaires](https://v2.tauri.app/plugin/)
- [Tauri — plugin Global Shortcut](https://v2.tauri.app/plugin/global-shortcut/)
- [Tauri — référence CLI](https://v2.tauri.app/reference/cli/)
- [Tauri — configuration des fenêtres et `create: false`](https://v2.tauri.app/reference/config/#windowconfig)
- [Tauri — API Rust de `WebviewWindowBuilder`](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html)
- [Tauri — API Rust de `Monitor`](https://docs.rs/tauri/latest/tauri/window/struct.Monitor.html)
