import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface Props {
  onFinish: () => void;
}

export default function AnimatedSplashScreen({ onFinish }: Props) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo pop in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 2. Title slide up
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 3. Tagline fade in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      // 4. Progress bar fill
      Animated.timing(progressWidth, {
        toValue: width * 0.55,
        duration: 800,
        useNativeDriver: false,
      }),
      // 5. Short pause then fade out
      Animated.delay(300),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Background circles for depth */}
      <View style={styles.circleLarge} />
      <View style={styles.circleSmall} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrapper,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="wallet" size={52} color="#5bc5a7" />
        </View>
        {/* Small badge icons */}
        <View style={[styles.badge, styles.badgeTopRight]}>
          <Ionicons name="receipt" size={16} color="#fff" />
        </View>
        <View style={[styles.badge, styles.badgeBottomLeft]}>
          <Ionicons name="people" size={16} color="#fff" />
        </View>
      </Animated.View>

      {/* App name */}
      <Animated.Text
        style={[
          styles.title,
          { opacity: titleOpacity, transform: [{ translateY: titleY }] },
        ]}
      >
        Splitwise
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Split expenses. Stay friends.
      </Animated.Text>

      {/* Feature pills */}
      <Animated.View style={[styles.pillsRow, { opacity: taglineOpacity }]}>
        {["💸 Split", "📊 Track", "✅ Settle"].map((label) => (
          <View key={label} style={styles.pill}>
            <Text style={styles.pillText}>{label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#5bc5a7",
    alignItems: "center",
    justifyContent: "center",
  },
  circleLarge: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -80,
    right: -100,
  },
  circleSmall: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.07)",
    bottom: -40,
    left: -60,
  },
  logoWrapper: {
    marginBottom: 28,
    position: "relative",
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  badge: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#3da98a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#5bc5a7",
  },
  badgeTopRight: { top: -4, right: -4 },
  badgeBottomLeft: { bottom: -4, left: -4 },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.5,
    marginBottom: 24,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 48,
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  pillText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  progressTrack: {
    width: width * 0.55,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
});
