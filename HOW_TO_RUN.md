# Running FlyBye locally

Open this folder (`flybye/`) as the workspace root in VS Code. The `.vscode/`
configs below are already set up. Install the recommended extensions when prompted
(**Flutter** + **Dart**).

## One-click (VS Code Run & Debug panel — `Cmd+Shift+D`)
- **🌐 Web (Vite + Chrome)** — starts the Vite dev server and opens Chrome at
  http://localhost:8080.
- **📱 Mobile (Flutter)** — runs the Flutter app; VS Code will ask which device
  (iOS Simulator / Android emulator / Chrome). Pick one, or boot a simulator first.
- **▶ Web + Mobile (both)** — a compound that launches both at once.

## From the terminal instead

### Web (`flybye-webapp`)
```bash
cd flybye-webapp
npm install      # first time only
npm run dev      # http://localhost:8080
```

### Mobile (`flybye-app`)
```bash
cd flybye-app
flutter pub get  # first time only
flutter run      # pick a booted simulator/emulator/device
```

## Notes
- Both apps read the shared Supabase project from their `.env` files (already set).
- If the Flutter extension can't find your SDK, set `dart.flutterSdkPath` in
  `.vscode/settings.json` (it's currently set for this machine).
- Port 8080 is the web dev port (configured in `flybye-webapp/vite.config.ts`).
- Tasks (`Cmd+Shift+P → Run Task`): `web: dev server`, `web: build`,
  `web: install deps`, `mobile: pub get`, `mobile: analyze`.
