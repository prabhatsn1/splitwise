import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { NetworkError, UserService } from "../services/userService";
import { SUPABASE_CONFIG } from "../config";

export default function LoginScreen() {
  const { loginUser, createUser, continueOffline, state } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");
  const [showRetryOptions, setShowRetryOptions] = useState(false);
  const [lastError, setLastError] = useState<NetworkError | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailError, setResetEmailError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    console.log('[LoginScreen] Component mounted, starting connectivity check');
    checkConnectivity();
  }, []);

  const checkConnectivity = async () => {
    console.log('[LoginScreen] Checking connectivity...');
    setConnectionStatus("checking");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[LoginScreen] Connection check timed out after 5000ms');
        controller.abort();
      }, 5000);

      const url = `${SUPABASE_CONFIG.URL}/rest/v1/`;
      console.log('[LoginScreen] Fetching:', url);
      console.log('[LoginScreen] Headers:', { apikey: SUPABASE_CONFIG.ANON_KEY.substring(0, 20) + '...' });
      
      const response = await fetch(url, {
        method: "HEAD",
        headers: { apikey: SUPABASE_CONFIG.ANON_KEY },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('[LoginScreen] Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });
      setConnectionStatus(response.ok ? "online" : "offline");
      console.log('[LoginScreen] Connection status set to:', response.ok ? "online" : "offline");
    } catch (error) {
      console.error('[LoginScreen] Connection check failed:', error);
      console.error('[LoginScreen] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error)
      });
      setConnectionStatus("offline");
      console.log('[LoginScreen] Connection status set to: offline');
    }
  };

  const handleError = (error: any) => {
    if (error instanceof NetworkError) {
      setLastError(error);
      setShowRetryOptions(error.isRetryable);

      switch (error.type) {
        case "network":
          Alert.alert("Connection Error", error.message, [
            { text: "Try Again", onPress: () => retryLastAction() },
            { text: "Go Offline", onPress: () => continueOffline() },
            { text: "Cancel", style: "cancel" },
          ]);
          break;
        case "auth":
          setErrorModal({
            title:
              error.action === "signup"
                ? "Sign Up Failed"
                : "Invalid Credentials",
            message: error.message,
          });
          break;
        case "validation":
          setErrorModal({ title: "Sign Up Error", message: error.message });
          break;
        default:
          setErrorModal({ title: "Error", message: error.message });
      }
    } else {
      setErrorModal({
        title: "Error",
        message: error.message || "An unexpected error occurred",
      });
    }
  };

  const retryLastAction = () => {
    if (lastError?.action === "login") {
      handleLogin();
    } else if (lastError?.action === "signup") {
      handleSignup();
    }
    setShowRetryOptions(false);
    setLastError(null);
  };

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val && !isValidEmail(val)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    if (!isValidEmail(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    setLoading(true);
    setLastError(null);
    setShowRetryOptions(false);

    try {
      await loginUser(email.trim().toLowerCase(), password);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Error", "Please enter both name and email");
      return;
    }
    if (!isValidEmail(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (phone.trim() && !/^\+?[0-9]{7,15}$/.test(phone.trim())) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setLastError(null);
    setShowRetryOptions(false);

    try {
      await createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmed = resetEmail.trim();
    if (!trimmed) {
      setResetEmailError("Please enter your email address");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setResetEmailError("Please enter a valid email address");
      return;
    }
    setResetEmailError("");
    setResetLoading(true);
    try {
      const userService = new UserService();
      await userService.sendPasswordResetEmail(trimmed);
      setResetSent(true);
    } catch (error: any) {
      setResetEmailError(
        error?.message || "Failed to send reset email. Please try again.",
      );
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPassword = () => {
    setForgotPasswordVisible(false);
    setResetEmail("");
    setResetEmailError("");
    setResetSent(false);
  };

  const handleContinueOffline = () => {
    setLastError(null);
    setShowRetryOptions(false);
    continueOffline();
  };

  const renderConnectionStatus = () => {
    if (connectionStatus === "checking") {
      return (
        <View style={styles.connectionStatus}>
          <ActivityIndicator size="small" color="#666" />
          <Text style={styles.connectionText}>Checking connection...</Text>
        </View>
      );
    }

    if (connectionStatus === "offline") {
      return (
        <View style={[styles.connectionStatus, styles.offlineStatus]}>
          <Ionicons name="cloud-offline" size={16} color="#e74c3c" />
          <Text style={[styles.connectionText, styles.offlineText]}>
            No internet connection
          </Text>
          <TouchableOpacity
            onPress={checkConnectivity}
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={16} color="#3498db" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.connectionStatus, styles.onlineStatus]}>
        <Ionicons name="cloud-done" size={16} color="#27ae60" />
        <Text style={[styles.connectionText, styles.onlineText]}>
          Connected
        </Text>
      </View>
    );
  };

  const renderRetryOptions = () => {
    if (!showRetryOptions || !lastError) return null;

    return (
      <View style={styles.retryContainer}>
        <Text style={styles.retryTitle}>Connection failed</Text>
        <Text style={styles.retryMessage}>{lastError.message}</Text>
        <View style={styles.retryButtons}>
          <TouchableOpacity
            style={styles.retryActionButton}
            onPress={retryLastAction}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryActionText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.offlineActionButton}
            onPress={handleContinueOffline}
          >
            <Ionicons name="phone-portrait-outline" size={16} color="#666" />
            <Text style={styles.offlineActionText}>Go Offline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* Forgot Password Modal */}
      <Modal
        visible={forgotPasswordVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForgotPassword}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Ionicons
                name={resetSent ? "checkmark-circle" : "lock-open-outline"}
                size={40}
                color={resetSent ? "#27ae60" : "#5bc5a7"}
              />
            </View>
            <Text style={styles.modalTitle}>
              {resetSent ? "Email Sent" : "Reset Password"}
            </Text>
            {resetSent ? (
              <Text style={styles.modalMessage}>
                A password reset link has been sent to{" "}
                <Text style={{ fontWeight: "600" }}>{resetEmail.trim()}</Text>.
                Please check your inbox.
              </Text>
            ) : (
              <>
                <Text style={styles.modalMessage}>
                  Enter your registered email and we'll send you a link to reset
                  your password.
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.resetInput,
                    !!resetEmailError && styles.inputError,
                  ]}
                  value={resetEmail}
                  onChangeText={(v) => {
                    setResetEmail(v);
                    setResetEmailError("");
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!resetLoading}
                />
                {!!resetEmailError && (
                  <Text style={[styles.errorText, styles.resetErrorText]}>
                    {resetEmailError}
                  </Text>
                )}
              </>
            )}
            <View style={styles.resetModalButtons}>
              {!resetSent && (
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.resetSendButton,
                    resetLoading && styles.disabledButton,
                  ]}
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  resetSent ? styles.resetSendButton : styles.resetCancelButton,
                ]}
                onPress={closeForgotPassword}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    !resetSent && styles.resetCancelText,
                  ]}
                >
                  {resetSent ? "Done" : "Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={!!errorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="alert-circle" size={40} color="#e74c3c" />
            </View>
            <Text style={styles.modalTitle}>{errorModal?.title}</Text>
            <Text style={styles.modalMessage}>{errorModal?.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setErrorModal(null)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="wallet" size={64} color="#5bc5a7" />
            </View>
            <Text style={styles.title}>Splitwise</Text>
            <Text style={styles.subtitle}>Split expenses with friends</Text>
            {renderConnectionStatus()}
          </View>

          {renderRetryOptions()}

          <View style={styles.form}>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === "login" && styles.activeModeButton,
                ]}
                onPress={() => setMode("login")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === "login" && styles.activeModeButtonText,
                  ]}
                >
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === "signup" && styles.activeModeButton,
                ]}
                onPress={() => setMode("signup")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === "signup" && styles.activeModeButtonText,
                  ]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {mode === "signup" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            )}

            {mode === "signup" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone (optional)</Text>
                <TextInput
                  style={[styles.input, !!phoneError && styles.inputError]}
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    if (val && !/^\+?[0-9]{7,15}$/.test(val)) {
                      setPhoneError("Please enter a valid phone number");
                    } else {
                      setPhoneError("");
                    }
                  }}
                  placeholder="e.g. +91 9876543210"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  editable={!loading}
                />
                {!!phoneError && (
                  <Text style={styles.errorText}>{phoneError}</Text>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, !!emailError && styles.inputError]}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              {!!emailError && (
                <Text style={styles.errorText}>{emailError}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {mode === "login" && (
              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={() => {
                  setResetEmail(email);
                  setForgotPasswordVisible(true);
                }}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.authButton,
                (loading || connectionStatus === "checking") &&
                  styles.disabledButton,
              ]}
              onPress={mode === "login" ? handleLogin : handleSignup}
              disabled={loading || connectionStatus === "checking"}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.authButtonText}>
                    {mode === "login" ? "Logging in..." : "Signing up..."}
                  </Text>
                </View>
              ) : (
                <Text style={styles.authButtonText}>
                  {mode === "login" ? "Login" : "Sign Up"}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.offlineButton}
              onPress={handleContinueOffline}
              disabled={loading}
            >
              <Ionicons name="phone-portrait-outline" size={20} color="#666" />
              <Text style={styles.offlineButtonText}>Continue Offline</Text>
            </TouchableOpacity>

            <Text style={styles.offlineNote}>
              Your data will be saved locally and can be synced later when you
              login.{" "}
              {connectionStatus === "offline" &&
                "Perfect for when you're offline!"}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f8f9fa",
  },
  onlineStatus: {
    backgroundColor: "#d4edda",
  },
  offlineStatus: {
    backgroundColor: "#f8d7da",
  },
  connectionText: {
    fontSize: 12,
    marginLeft: 6,
    color: "#666",
  },
  onlineText: {
    color: "#155724",
  },
  offlineText: {
    color: "#721c24",
  },
  retryButton: {
    marginLeft: 8,
    padding: 2,
  },
  retryContainer: {
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  retryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#856404",
    marginBottom: 4,
  },
  retryMessage: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 12,
  },
  retryButtons: {
    flexDirection: "row",
    gap: 8,
  },
  retryActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5bc5a7",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  retryActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  offlineActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  offlineActionText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 6,
  },
  activeModeButton: {
    backgroundColor: "#5bc5a7",
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  activeModeButtonText: {
    color: "#fff",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#e74c3c",
  },
  errorText: {
    fontSize: 12,
    color: "#e74c3c",
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  authButton: {
    backgroundColor: "#5bc5a7",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  authButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#666",
  },
  offlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  offlineButtonText: {
    fontSize: 16,
    color: "#666",
    marginLeft: 8,
    fontWeight: "500",
  },
  offlineNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconWrap: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginTop: -12,
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#5bc5a7",
    fontWeight: "500",
  },
  resetInput: {
    width: "100%",
    marginBottom: 4,
  },
  resetErrorText: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  resetModalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  resetSendButton: {
    backgroundColor: "#5bc5a7",
    paddingHorizontal: 20,
  },
  resetCancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 20,
  },
  resetCancelText: {
    color: "#666",
  },
});
