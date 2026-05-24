---
name: react-native-mobile-design
description: Create distinctive, production-grade mobile interfaces for React Native with high design quality. Use when (1) user asks to build mobile UI components or screens, (2) user wants to improve mobile app aesthetics, (3) user needs help with animations, theming, or mobile design patterns, (4) user mentions "mobile design", "app UI", "mobile styling", or "beautiful app".
category: mobile
---

# Mobile Design (React Native)

Create distinctive, production-grade mobile interfaces that prioritize design quality and avoid generic AI aesthetics. This skill adapts web design principles for native mobile experiences.

## Design Philosophy

### Before You Code

1. **Establish a Visual Direction**: Define the aesthetic before implementation
   - Minimal & Clean (Apple-inspired)
   - Bold & Expressive (Spotify, Duolingo)
   - Luxury & Refined (banking apps)
   - Playful & Colorful (social apps)
   - Brutalist & Raw (artistic apps)

2. **Avoid Generic Patterns**:
   - Don't default to boring grays and blues
   - Don't use predictable card-based layouts everywhere
   - Don't rely on stock icons without customization
   - Don't use system fonts when custom fonts would elevate the design

3. **Match Complexity to Vision**:
   - Expressive designs → elaborate animations, bold colors, creative layouts
   - Minimal designs → precise spacing, refined typography, subtle interactions

## Tech Stack

| Tool | Purpose |
|------|---------|
| NativeWind | Tailwind CSS for React Native |
| tailwind-variants | Type-safe component variants |
| react-native-reanimated | Performant animations |
| react-native-gesture-handler | Touch interactions |
| expo-image | Optimized images with blur hash |
| @gorhom/bottom-sheet | Beautiful bottom sheets |

## Color System

### Define a Bold Palette

```javascript
// components/ui/colors.js
module.exports = {
  // Primary - Make it memorable
  primary: {
    50: '#fff1f3',
    100: '#ffe0e5',
    200: '#ffc6cf',
    300: '#ff9dac',
    400: '#ff637b',
    500: '#ff3355',  // Your signature color
    600: '#ed1144',
    700: '#c70d38',
    800: '#a50f33',
    900: '#8a1232',
  },

  // Neutrals - Warm grays feel more human
  neutral: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
    950: '#0c0a09',
  },

  // Accent - For highlights and CTAs
  accent: {
    DEFAULT: '#6366f1',  // Indigo
    light: '#818cf8',
    dark: '#4f46e5',
  },

  // Semantic
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};
```

### Dark Mode with Personality

```tsx
// Don't just invert colors - design for dark mode
const darkTheme = {
  background: '#0c0a09',      // Near black, not pure #000
  surface: '#1c1917',         // Elevated surfaces
  surfaceElevated: '#292524', // Cards, modals
  text: '#fafaf9',
  textMuted: '#a8a29e',
  border: '#44403c',
  primary: '#ff637b',         // Lighter primary for dark
};
```

## Typography

### Use Distinctive Fonts

```tsx
// app.config.ts - Load custom fonts
plugins: [
  [
    'expo-font',
    {
      fonts: [
        './assets/fonts/Satoshi-Variable.ttf',
        './assets/fonts/Clash-Display.ttf',
      ],
    },
  ],
],

// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      sans: ['Satoshi-Variable'],
      display: ['Clash-Display'],
    },
  },
};
```

### Typography Scale

```tsx
// components/ui/text.tsx
import { tv } from 'tailwind-variants';

const text = tv({
  base: 'text-neutral-900 dark:text-neutral-50',
  variants: {
    variant: {
      // Display - Hero text, big numbers
      display: 'font-display text-5xl font-bold tracking-tight',

      // Headings
      h1: 'font-display text-3xl font-bold tracking-tight',
      h2: 'font-display text-2xl font-semibold',
      h3: 'font-sans text-xl font-semibold',

      // Body
      body: 'font-sans text-base leading-relaxed',
      bodyLarge: 'font-sans text-lg leading-relaxed',

      // UI
      label: 'font-sans text-sm font-medium uppercase tracking-wide',
      caption: 'font-sans text-sm text-neutral-500 dark:text-neutral-400',

      // Special
      mono: 'font-mono text-sm',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});
```

## Component Design Patterns

### Buttons with Character

```tsx
import { tv } from 'tailwind-variants';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const button = tv({
  base: 'items-center justify-center overflow-hidden',
  variants: {
    variant: {
      primary: 'bg-primary-500 shadow-lg shadow-primary-500/30',
      secondary: 'bg-neutral-100 dark:bg-neutral-800',
      ghost: 'bg-transparent',
      gradient: 'overflow-hidden', // For gradient background
    },
    size: {
      sm: 'h-10 px-4 rounded-lg',
      md: 'h-12 px-6 rounded-xl',
      lg: 'h-14 px-8 rounded-2xl',
      xl: 'h-16 px-10 rounded-2xl', // Hero buttons
    },
    rounded: {
      full: 'rounded-full',
    },
  },
});

export const Button = ({ label, variant, size, onPress }) => {
  const scale = useSharedValue(1);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.95, { damping: 15 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15 });
      onPress?.();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle} className={button({ variant, size })}>
        <Text className="font-semibold text-white">{label}</Text>
      </Animated.View>
    </GestureDetector>
  );
};
```

### Cards with Depth

```tsx
const card = tv({
  base: 'overflow-hidden',
  variants: {
    elevation: {
      flat: 'bg-neutral-50 dark:bg-neutral-900',
      raised: 'bg-white dark:bg-neutral-800 shadow-sm',
      floating: 'bg-white dark:bg-neutral-800 shadow-xl shadow-black/10',
    },
    radius: {
      md: 'rounded-xl',
      lg: 'rounded-2xl',
      xl: 'rounded-3xl',
    },
  },
  defaultVariants: {
    elevation: 'raised',
    radius: 'lg',
  },
});

// Usage with gradient border
<View className="p-[1px] rounded-2xl bg-gradient-to-br from-primary-400 to-accent">
  <View className={card({ elevation: 'floating' })}>
    {children}
  </View>
</View>
```

## Animations

### Meaningful Motion

```tsx
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Layout,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Spring config for natural feel
const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

// List items with staggered entry
const ListItem = ({ index, children }) => (
  <Animated.View
    entering={FadeIn.delay(index * 50).springify()}
    exiting={FadeOut}
    layout={Layout.springify()}
  >
    {children}
  </Animated.View>
);

// Micro-interaction: Like button
const LikeButton = () => {
  const scale = useSharedValue(1);
  const [liked, setLiked] = useState(false);

  const handlePress = () => {
    scale.value = withSpring(1.3, springConfig, () => {
      scale.value = withSpring(1, springConfig);
    });
    setLiked(!liked);
  };

  return (
    <Animated.View style={useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }))}>
      <Pressable onPress={handlePress}>
        <HeartIcon filled={liked} />
      </Pressable>
    </Animated.View>
  );
};
```

### Screen Transitions

```tsx
// Shared element transitions (Expo Router)
import { Link } from 'expo-router';
import Animated, { SharedTransition } from 'react-native-reanimated';

<Link href={`/product/${id}`} asChild>
  <Pressable>
    <Animated.Image
      sharedTransitionTag={`product-${id}`}
      source={{ uri: image }}
      className="w-full h-48 rounded-2xl"
    />
  </Pressable>
</Link>
```

## Layout Patterns

### Break the Grid

```tsx
// Overlapping elements
<View className="relative">
  <Image className="w-full h-64 rounded-3xl" source={...} />
  <View className="absolute -bottom-6 left-4 right-4 bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-lg">
    <Text variant="h3">{title}</Text>
  </View>
</View>

// Asymmetric spacing
<View className="pl-6 pr-4"> {/* Intentionally uneven */}
  <Text className="text-left">{content}</Text>
</View>

// Full-bleed images with inset content
<View className="-mx-4">
  <Image className="w-screen h-80" source={...} />
</View>
```

### Generous Whitespace

```tsx
// Section spacing
<View className="py-12 space-y-8">
  <Text variant="h2" className="px-6">Featured</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {/* Content */}
  </ScrollView>
</View>

// Card internal spacing
<View className="p-6 space-y-4">
  <Text variant="h3">{title}</Text>
  <Text variant="body" className="leading-relaxed">{description}</Text>
</View>
```

## Platform Considerations

### Touch Targets

```tsx
// Minimum 44pt touch targets (Apple HIG)
<Pressable className="min-h-[44px] min-w-[44px] items-center justify-center">
  <Icon size={24} />
</Pressable>

// Extend touch area without visual change
<Pressable hitSlop={12}>
  <SmallIcon />
</Pressable>
```

### Safe Areas

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Screen = ({ children }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {children}
    </View>
  );
};

// Or with NativeWind
<View className="pt-safe pb-safe">
  {children}
</View>
```

### Haptic Feedback

```tsx
import * as Haptics from 'expo-haptics';

const InteractiveButton = ({ onPress }) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  return <Pressable onPress={handlePress}>...</Pressable>;
};
```

## Resources

- **Color Palettes**: [references/color-palettes.md](references/color-palettes.md)
- **Animation Patterns**: [references/animations.md](references/animations.md)
- **Component Gallery**: [references/components.md](references/components.md)
