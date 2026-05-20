---
name: mobile
version: 1
---

# Mobile Development

Build, review, and debug mobile applications for iOS, Android, and cross-platform (React Native, Flutter, Expo).

## When to use this skill

- User is building a mobile app or feature
- User mentions React Native, Flutter, Expo, Swift, SwiftUI, Kotlin, Jetpack Compose
- User asks about mobile navigation, gestures, or animations
- User wants to submit to the App Store or Google Play
- User asks about push notifications, deep links, or offline support
- User mentions performance issues specific to mobile (jank, ANR, crash on low-end device)
- User wants to test on a simulator/emulator or real device

## Procedure

### Step 1: Identify the platform and framework

```bash
# React Native
cat package.json | grep -E '"(react-native|expo|@react-navigation)'
npx react-native info

# Flutter
flutter --version
cat pubspec.yaml | head -30

# Native iOS
cat Podfile | head -20
cat *.xcodeproj/project.pbxproj | grep -c CONFIGURATION

# Native Android
cat build.gradle | grep -E '(compileSdk|targetSdk|minSdk|versionName)'
```

### Step 2: Check platform requirements

**iOS App Store:**
- Minimum iOS version (currently 16+ recommended for new apps)
- Privacy manifest (`PrivacyInfo.xcprivacy`) required for certain APIs
- Required device capabilities declared in Info.plist
- No private API usage

**Google Play:**
- Target API level (must be within 1 year of latest Android release)
- 64-bit support required
- Permissions declared in AndroidManifest.xml match actual usage

### Step 3: Navigation architecture

Check that navigation is platform-appropriate:
- **Stack navigation**: correct for drill-down flows (list → detail)
- **Tab navigation**: correct for top-level sections (max 5 tabs)
- **Drawer navigation**: acceptable for secondary navigation on larger screens
- **Modal**: correct for temporary tasks that don't change context

Validate deep linking:
```bash
# React Native: check linking config
grep -r "linking" src/ --include="*.ts" --include="*.tsx" | head -10

# Test deep link
npx uri-scheme open "myapp://path/to/screen" --ios
```

### Step 4: Performance

**React Native:**
- Check for JS thread blocking: heavy computation should use `InteractionManager` or a background thread
- Lists: always use `FlatList`/`SectionList`, never `ScrollView` for dynamic data
- Images: use `FastImage` or proper caching; always set explicit width/height
- Animations: use `Animated` API or `react-native-reanimated` (runs on UI thread, no jank)
- Check re-renders with `why-did-you-render`

```bash
# Check for ScrollView with dynamic lists (anti-pattern)
grep -rn "ScrollView" src/ --include="*.tsx" | grep -v "Horizontal"
```

**Flutter:**
- Use `const` constructors wherever possible (avoids unnecessary rebuilds)
- Profile with Flutter DevTools: `flutter run --profile`
- Check for `setState` called on large widget trees

**Native:**
- Profile with Instruments (iOS) or Android Profiler
- Main thread must never be blocked (network calls, file I/O off-thread always)

### Step 5: Offline support

- Identify which data must be available offline
- Choose appropriate persistence: AsyncStorage (simple KV), SQLite (relational), MMKV (fast KV), Realm/WatermelonDB (complex)
- Implement optimistic updates for actions that should feel instant
- Handle sync conflicts (last-write-wins or user prompt)

```bash
# Check AsyncStorage usage
grep -rn "AsyncStorage" src/ --include="*.ts" --include="*.tsx" | wc -l
```

### Step 6: Push notifications

```bash
# React Native: check notification library
grep -E '"(@notifee|react-native-push-notification|expo-notifications)"' package.json
```

Requirements:
- iOS: request permission at the right moment (not on launch — context matters)
- Android: notification channels required for Android 8+
- Handle foreground, background, and killed app states
- Deep link from notification tap to correct screen

### Step 7: Device compatibility

Test on:
- Oldest supported OS version (not just latest)
- Small screen (iPhone SE / low-end Android) AND large screen (tablet)
- Low-end hardware: 2GB RAM Android device if targeting broad markets
- Poor network conditions: use network throttling in simulator

```bash
# React Native: run on specific simulator
xcrun simctl list devices | grep "iPhone SE"
npx react-native run-ios --simulator="iPhone SE (3rd generation)"
```

### Step 8: App store preparation

**iOS (Xcode):**
```bash
# Check bundle ID, version, and build number
grep -E "(PRODUCT_BUNDLE_IDENTIFIER|MARKETING_VERSION|CURRENT_PROJECT_VERSION)" *.xcodeproj/project.pbxproj
```

**Android:**
```bash
# Check version code and name
grep -E "(versionCode|versionName)" app/build.gradle
```

Required:
- App icons for all required sizes
- Screenshots for all required device sizes
- Privacy policy URL
- Age rating questionnaire complete

## Common patterns

### React Native: safe area handling
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
// Always wrap root screens — never use magic padding numbers
<SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
  <YourContent />
</SafeAreaView>
```

### React Native: platform-specific code
```ts
import { Platform } from 'react-native';
const shadowStyle = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  android: { elevation: 4 },
});
```

## Red flags to report

- `ScrollView` wrapping `FlatList` or long dynamic lists (causes entire list to render at once)
- Network calls on the JS/main thread without `InteractionManager`
- Hardcoded pixel values instead of `Dimensions` or percentage-based sizing
- Missing `keyExtractor` on `FlatList` (causes incorrect item recycling)
- Push notification permission requested on cold launch with no context
- App crashing silently — check for missing error boundaries
- Linking to external URLs without `Linking.canOpenURL` check first
- Storing sensitive data in `AsyncStorage` (not encrypted — use `react-native-keychain` or iOS Keychain)
