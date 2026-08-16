# Generated app icons

## iOS

After running `flutter create`, replace `ios/Runner/Assets.xcassets/AppIcon.appiconset/` with the contents of `assets/icons/ios/AppIcon.appiconset/`:

```bash
rm -rf ios/Runner/Assets.xcassets/AppIcon.appiconset
cp -R assets/icons/ios/AppIcon.appiconset ios/Runner/Assets.xcassets/
```

Xcode reads `Contents.json` and picks the right size automatically. Verify by opening the project and clicking on `AppIcon` in the asset catalog — every slot should show the icon.

## Android

After `flutter create`, copy the launcher PNGs into `android/app/src/main/res/`:

```bash
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  cp assets/icons/android/mipmap-$d/ic_launcher.png \
     android/app/src/main/res/mipmap-$d/ic_launcher.png
done

# Adaptive icon (Android 8+)
mkdir -p android/app/src/main/res/mipmap-anydpi-v26
cp assets/icons/android/mipmap-anydpi-v26/ic_launcher.xml \
   android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml

# Adaptive icon foreground/background — Android Studio convention is to
# put these alongside the regular launcher PNGs in mipmap-xxxhdpi
cp assets/icons/android/ic_launcher_foreground.png \
   android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png
cp assets/icons/android/ic_launcher_background.png \
   android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_background.png
```

## Play Store listing

Use `assets/icons/play/icon-512.png` (512×512) as the **app icon** in Google Play Console.

For the **feature graphic** (1024×500 banner) see `assets/icons/play/feature-graphic.png` (generated separately).
