import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  CameraView,
  CameraType,
  FlashMode,
  useCameraPermissions,
} from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

interface ReceiptCameraProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (imageUri: string) => void;
}

const { width, height } = Dimensions.get("window");

export default function ReceiptCamera({
  visible,
  onClose,
  onCapture,
}: ReceiptCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          skipProcessing: false,
        });
        if (photo?.uri) {
          setCapturedImage(photo.uri);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to capture image");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      setCapturedImage(null);
      onClose();
    }
  };

  const pickFromGallery = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission required",
        "Permission to access camera roll is required!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      onCapture(result.assets[0].uri);
      onClose();
    }
  };

  const toggleFlash = () => {
    setFlashMode(
      flashMode === "off" ? "on" : flashMode === "on" ? "auto" : "off",
    );
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case "on":
        return "flash";
      case "auto":
        return "flash-outline";
      default:
        return "flash-off";
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Ionicons name="camera-outline" size={60} color="#ccc" />
            <Text style={styles.permissionTitle}>
              Camera Permission Required
            </Text>
            <Text style={styles.permissionText}>
              To capture receipts, please grant camera permission.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.permissionButton,
                { backgroundColor: "#ccc", marginTop: 10 },
              ]}
              onPress={onClose}
            >
              <Text style={styles.permissionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {capturedImage ? (
          // Preview captured image
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: capturedImage }}
              style={styles.previewImage}
            />

            {/* Preview Controls */}
            <View style={styles.previewControls}>
              <TouchableOpacity
                style={styles.previewButton}
                onPress={retakePicture}
              >
                <Ionicons name="camera-reverse" size={24} color="#fff" />
                <Text style={styles.previewButtonText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.previewButton}
                onPress={confirmCapture}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.previewButtonText}>Use Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          // Camera view
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              flash={flashMode}
            >
              {/* Camera overlay */}
              <View style={styles.overlay}>
                {/* Receipt guidelines */}
                <View style={styles.guidelineContainer}>
                  <View style={styles.guideline} />
                  <Text style={styles.guideText}>
                    Position receipt within the frame
                  </Text>
                </View>

                {/* Top controls */}
                <View style={styles.topControls}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={onClose}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={toggleFlash}
                  >
                    <Ionicons name={getFlashIcon()} size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Bottom controls */}
                <View style={styles.bottomControls}>
                  <TouchableOpacity
                    style={styles.galleryButton}
                    onPress={pickFromGallery}
                  >
                    <Ionicons name="images" size={24} color="#fff" />
                    <Text style={styles.galleryButtonText}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={takePicture}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="large" color="#fff" />
                    ) : (
                      <View style={styles.captureButtonInner} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.flipButton}
                    onPress={() =>
                      setFacing(facing === "back" ? "front" : "back")
                    }
                  >
                    <Ionicons name="camera-reverse" size={24} color="#fff" />
                    <Text style={styles.flipButtonText}>Flip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContent: {
    backgroundColor: "#fff",
    padding: 30,
    margin: 20,
    borderRadius: 15,
    alignItems: "center",
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: "#5bc5a7",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  guidelineContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  guideline: {
    width: width - 80,
    height: height * 0.6,
    borderWidth: 2,
    borderColor: "#5bc5a7",
    borderStyle: "dashed",
    borderRadius: 10,
    marginBottom: 20,
  },
  guideText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topControls: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  galleryButton: {
    alignItems: "center",
    minWidth: 60,
  },
  galleryButtonText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 5,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  flipButton: {
    alignItems: "center",
    minWidth: 60,
  },
  flipButtonText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 5,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  previewImage: {
    flex: 1,
    resizeMode: "contain",
  },
  previewControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 40,
  },
  previewButton: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    minWidth: 100,
  },
  previewButtonText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 5,
    fontWeight: "600",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
