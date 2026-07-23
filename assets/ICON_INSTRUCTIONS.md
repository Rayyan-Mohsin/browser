# App icon

`electron-builder.yml` expects `assets/icon.icns`. Generating a `.icns` requires
macOS-only tools, so it isn't included in this repo — generate it once on your Mac:

1. Create a 1024x1024 PNG at `assets/icon.png` (your logo/design).
2. Run:

   ```bash
   mkdir icon.iconset
   sips -z 16 16     assets/icon.png --out icon.iconset/icon_16x16.png
   sips -z 32 32     assets/icon.png --out icon.iconset/icon_16x16@2x.png
   sips -z 32 32     assets/icon.png --out icon.iconset/icon_32x32.png
   sips -z 64 64     assets/icon.png --out icon.iconset/icon_32x32@2x.png
   sips -z 128 128   assets/icon.png --out icon.iconset/icon_128x128.png
   sips -z 256 256   assets/icon.png --out icon.iconset/icon_128x128@2x.png
   sips -z 256 256   assets/icon.png --out icon.iconset/icon_256x256.png
   sips -z 512 512   assets/icon.png --out icon.iconset/icon_256x256@2x.png
   sips -z 512 512   assets/icon.png --out icon.iconset/icon_512x512.png
   cp assets/icon.png icon.iconset/icon_512x512@2x.png
   iconutil -c icns icon.iconset -o assets/icon.icns
   rm -rf icon.iconset
   ```

3. Re-run `./build.sh`.

Until `assets/icon.icns` exists, `electron-builder` will fail with a missing-icon
error — this is expected on a fresh clone off-Mac.
