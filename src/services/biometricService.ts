import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BIOMETRIC_ENABLED_KEY = "@splitwise_biometric_enabled";

export class BiometricService {
  private static instance: BiometricService;

  private constructor() {}

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  /**
   * Check whether the device supports any form of biometric authentication.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch {
      return false;
    }
  }

  /**
   * Returns the types available on the device (fingerprint, facial recognition, iris).
   */
  async getSupportedTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch {
      return [];
    }
  }

  /**
   * Returns a human-readable label for the dominant biometric type.
   */
  async getBiometricLabel(): Promise<string> {
    const types = await this.getSupportedTypes();
    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      return "Face ID";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return "Fingerprint";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return "Iris";
    }
    return "Biometrics";
  }

  /**
   * Prompt the user for biometric authentication.
   * Returns `true` if authentication succeeded.
   */
  async authenticate(promptMessage?: string): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage ?? "Authenticate to open Splitwise",
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  // ---- Preference persistence ----

  async isBiometricEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return value === "true";
    } catch {
      return false;
    }
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        BIOMETRIC_ENABLED_KEY,
        enabled ? "true" : "false",
      );
    } catch (error) {
      console.error("Failed to persist biometric preference:", error);
    }
  }
}

export default BiometricService;
