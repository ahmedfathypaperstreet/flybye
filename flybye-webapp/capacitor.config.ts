import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // TODO: register a real bundle id before an actual native/store build.
  appId: 'app.flybye.web',
  appName: 'FlyBye',
  // Ship the locally-built bundle (from `npm run build`) instead of loading a
  // hosted Lovable preview URL, so native builds run the real app offline-capable.
  webDir: 'dist',
};

export default config;
