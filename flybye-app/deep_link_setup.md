# FlyBye — Password Reset Deep Link Setup

The reset email sends users back to `flybye://reset-password`.
You need to register this URL scheme on both platforms and in Supabase.

---

## 1. Supabase Dashboard

1. Go to **Authentication → URL Configuration**
2. Under **Redirect URLs**, add:
   ```
   flybye://reset-password
   ```
3. Save.

---

## 2. Android — `android/app/src/main/AndroidManifest.xml`

Inside the `<activity>` tag (the one with `android.intent.action.MAIN`), add:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="flybye" android:host="reset-password" />
</intent-filter>
```

---

## 3. iOS — `ios/Runner/Info.plist`

Add the following inside the top-level `<dict>`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>flybye</string>
    </array>
  </dict>
</array>
```

---

## 4. Flutter — Handle the deep link

`supabase_flutter` handles the URL automatically when the app resumes from
a deep link **as long as** you're listening to `onAuthStateChange`.

The `auth_service.dart` file wires this up. In your root widget:

```dart
_passwordResetService.startListening(
  onRecovery: () {
    navigatorKey.currentState?.pushNamedAndRemoveUntil(
      '/reset-password',
      (route) => route.settings.name == '/login',
    );
  },
);
```

---

## 5. Route map (add to your MaterialApp/GoRouter)

| Route              | Screen                    |
|--------------------|---------------------------|
| `/forgot-password` | `ForgotPasswordScreen()`  |
| `/reset-password`  | `ResetPasswordScreen()`   |

---

## How the full flow works

```
User taps "Forgot Password"
  → ForgotPasswordScreen
  → sendPasswordResetEmail(email)
  → Supabase sends email with link: flybye://reset-password#...token...

User taps link in email
  → OS opens FlyBye app
  → supabase_flutter intercepts the URL, parses the token
  → fires AuthChangeEvent.passwordRecovery
  → your listener navigates to /reset-password

User enters new password
  → ResetPasswordScreen
  → updateUser(password: newPassword)
  → signOut(scope: others)   ← kills all other sessions
  → navigates to /login
```
