import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Light theme colors
const LIGHT_COLORS = {
  primary: "#5bc5a7",
  primaryLight: "#f0faf9",
  primaryDark: "#3da88a",
  secondary: "#2196F3",
  success: "#4CAF50",
  successLight: "#e8f5e9",
  error: "#F44336",
  errorLight: "#ffebee",
  warning: "#FF9800",
  info: "#2196F3",
  textPrimary: "#333",
  textSecondary: "#666",
  textTertiary: "#999",
  textInverse: "#fff",
  background: "#f5f5f5",
  backgroundLight: "#fff",
  backgroundSecondary: "#fafafa",
  backgroundDark: "#f8f9fa",
  border: "#ddd",
  borderLight: "#f0f0f0",
  shadow: "#000",
  placeholder: "#999",
  card: "#fff",
  headerBackground: "#5bc5a7",
  headerText: "#fff",
  tabBarActive: "#5bc5a7",
  tabBarInactive: "gray",
  statusBar: "light" as const,
} as const;

// Dark theme colors
const DARK_COLORS = {
  primary: "#5bc5a7",
  primaryLight: "#1a3a33",
  primaryDark: "#3da88a",
  secondary: "#64B5F6",
  success: "#66BB6A",
  successLight: "#1b5e20",
  error: "#EF5350",
  errorLight: "#b71c1c",
  warning: "#FFA726",
  info: "#42A5F5",
  textPrimary: "#E0E0E0",
  textSecondary: "#BDBDBD",
  textTertiary: "#9E9E9E",
  textInverse: "#fff",
  background: "#121212",
  backgroundLight: "#1E1E1E",
  backgroundSecondary: "#2A2A2A",
  backgroundDark: "#171717",
  border: "#333",
  borderLight: "#2A2A2A",
  shadow: "#000",
  placeholder: "#757575",
  card: "#1E1E1E",
  headerBackground: "#1E1E1E",
  headerText: "#E0E0E0",
  tabBarActive: "#5bc5a7",
  tabBarInactive: "#757575",
  statusBar: "light" as const,
} as const;

export type ThemeColors = {
  readonly primary: string;
  readonly primaryLight: string;
  readonly primaryDark: string;
  readonly secondary: string;
  readonly success: string;
  readonly successLight: string;
  readonly error: string;
  readonly errorLight: string;
  readonly warning: string;
  readonly info: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly textInverse: string;
  readonly background: string;
  readonly backgroundLight: string;
  readonly backgroundSecondary: string;
  readonly backgroundDark: string;
  readonly border: string;
  readonly borderLight: string;
  readonly shadow: string;
  readonly placeholder: string;
  readonly card: string;
  readonly headerBackground: string;
  readonly headerText: string;
  readonly tabBarActive: string;
  readonly tabBarInactive: string;
  readonly statusBar: "light" | "dark";
};
export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: LIGHT_COLORS,
  isDark: false,
  themeMode: "system",
  setThemeMode: () => {},
});

const THEME_STORAGE_KEY = "@splitwise_theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeModeState(stored);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const isDark =
    themeMode === "system"
      ? systemColorScheme === "dark"
      : themeMode === "dark";

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { LIGHT_COLORS, DARK_COLORS };
