# OpenClaw Windows Hub attribution

FXMP OS ports the tray popup placement routine from OpenClaw Windows Hub's
`OpenClaw.Shared.MenuPositioner.CalculatePosition` into Rust. The upstream
implementation is available at:

https://github.com/openclaw/openclaw-windows-node/blob/4cbbe51c45a7653e75ecf7d85481d7014b7e374b/src/OpenClaw.Shared/MenuPositioner.cs

The popup UI is adapted to FXMP OS routes and is implemented as a restricted
Tauri window. The upstream repository's MIT license is preserved alongside
this attribution.
