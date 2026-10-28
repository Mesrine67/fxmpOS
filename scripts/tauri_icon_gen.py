"""Generate Windows, macOS and Windows Store icons for a Tauri app.

Original generator by Ibai Farina, MIT licensed.
The source image must be square and at least 512x512 pixels.
"""

import os
import sys

try:
    from PIL import Image
    import icnsutil
except ImportError:
    print("Missing dependency. Install Pillow and icnsutil.")
    sys.exit(1)

ICON_SIZES = {
    "32x32": 32,
    "128x128": 128,
    "128x128@2x": 256,
    "icon": 512,
    "Square30x30Logo": 30,
    "Square44x44Logo": 44,
    "Square71x71Logo": 71,
    "Square89x89Logo": 89,
    "Square107x107Logo": 107,
    "Square142x142Logo": 142,
    "Square150x150Logo": 150,
    "Square284x284Logo": 284,
    "Square310x310Logo": 310,
    "StoreLogo": 50,
}

source_path = input("Base icon path (square, 512x512 or larger): ").strip().strip('"')
if not source_path:
    print("A base icon path is required.")
    sys.exit(1)

try:
    with Image.open(source_path) as source:
        if source.width != source.height:
            raise ValueError("The base icon must be square.")
        if source.width < 512:
            raise ValueError("The base icon must be at least 512x512 pixels.")
        base = source.convert("RGBA")
except (OSError, ValueError) as error:
    print(f"Could not use the specified image: {error}")
    sys.exit(1)

os.makedirs("icons", exist_ok=True)
for filename, size in ICON_SIZES.items():
    base.resize((size, size), Image.Resampling.LANCZOS).save(
        os.path.join("icons", filename + ".png")
    )

ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
base.save(os.path.join("icons", "icon.ico"), sizes=ico_sizes)

# Use distinct ICNS sizes/retina keys; the original added the same 512px image twice.
icns = icnsutil.IcnsFile()
for filename in ("icon.png", "128x128@2x.png", "128x128.png", "32x32.png"):
    icns.add_media(file=os.path.join("icons", filename))
icns.write(os.path.join("icons", "icon.icns"))

print("Done! Icons were generated in the icons folder.")