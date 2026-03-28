import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface LoadingScreenProps {
  message?: string;
  error?: string | null;
}

export default function LoadingScreen({
  message = "Loading...",
  error,
}: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {error ? (
          <>
            <Ionicons name="warning-outline" size={64} color="#F44336" />
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Text style={styles.errorHint}>
              Please check your connection and try again
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#5bc5a7" />
            <Text style={styles.loadingText}>{message}</Text>
            <Text style={styles.loadingHint}>Connecting to database...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  loadingHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F44336",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
