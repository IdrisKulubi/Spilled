/**
 * UserApprovalModal - Modal for admin to review and approve user ID images
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Switch,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../../constants/Colors";
import { Spacing } from "../../constants/Styles";
import { TeaKEButton, TeaKECard } from "../../components/ui";
import {
  approveUserVerification,
  rejectUserVerification,
  getSignedImageUrl,
  PendingVerification,
} from "../../actions/adminActions";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface UserApprovalModalProps {
  visible: boolean;
  user: PendingVerification | null;
  onClose: () => void;
  onApprovalComplete: () => void;
}

export const UserApprovalModal: React.FC<UserApprovalModalProps> = ({
  visible,
  user,
  onClose,
  onApprovalComplete,
}) => {
  const [processing, setProcessing] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<boolean | null>(
    null
  );
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Generate signed URL for private bucket access when user changes
  React.useEffect(() => {
    const loadSignedImageUrl = async () => {
      if (user?.id_image_url) {
        setImageLoading(true);
        setImageError(null);

        try {
          const signedUrl = await getSignedImageUrl(user.id_image_url);
          if (signedUrl) {
            setImageUrl(signedUrl);
          } else {
            setImageUrl("");
            setImageError("Could not generate signed URL for image");
          }
        } catch (error) {
          console.error(
            "[UserApprovalModal] Error generating signed URL:",
            error
          );
          setImageUrl("");
          setImageError("Error accessing image from storage");
        } finally {
          setImageLoading(false);
        }
      } else {
        setImageUrl("");
        setImageError(null);
        setImageLoading(false);
      }
    };

    loadSignedImageUrl();
  }, [user?.id_image_url]);

  if (!user) return null;

  const handleClose = () => {
    if (processing) return;
    setApprovalDecision(null);
    onClose();
  };

  const handleApprove = async () => {
    if (!user || processing) return;

    setProcessing(true);
    try {
      const result = await approveUserVerification(user.user_id);

      if (result.success) {
        Alert.alert(
          "User Approved! ✅",
          `${
            user.nickname || user.email
          } has been successfully verified and can now use the app.`,
          [
            {
              text: "OK",
              onPress: () => {
                onApprovalComplete();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Approval Failed",
          result.error || "Could not approve user"
        );
      }
    } catch (error) {
      console.error("[UserApprovalModal] Error approving user:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!user || processing) return;

    Alert.alert(
      "Reject Verification",
      `Are you sure you want to reject ${
        user.nickname || user.email
      }'s verification?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            await handleRejectWithReason("ID verification failed");
          },
        },
      ]
    );
  };

  const handleRejectWithReason = async (reason: string) => {
    if (!user || processing) return;

    setProcessing(true);
    try {
      const result = await rejectUserVerification(user.user_id, reason);

      if (result.success) {
        Alert.alert(
          "User Rejected",
          `${
            user.nickname || user.email
          }'s verification has been rejected.\n\nReason: ${reason}`,
          [
            {
              text: "OK",
              onPress: () => {
                onApprovalComplete();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Rejection Failed",
          result.error || "Could not reject user"
        );
      }
    } catch (error) {
      console.error("[UserApprovalModal] Error rejecting user:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleApprovalToggle = (value: boolean) => {
    setApprovalDecision(value);
  };

  const handleConfirmDecision = () => {
    if (approvalDecision === true) {
      handleApprove();
    } else if (approvalDecision === false) {
      handleReject();
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDecisionText = (): string => {
    if (approvalDecision === true) return "Approve";
    if (approvalDecision === false) return "Reject";
    return "Make Decision";
  };

  const getDecisionColor = (): string => {
    if (approvalDecision === true) return "#76C893";
    if (approvalDecision === false) return "#F25F5C";
    return Colors.light.textSecondary;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            disabled={processing}
          >
            <MaterialIcons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Verification</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Info */}
          <TeaKECard style={styles.userInfoCard}>
            <Text style={styles.sectionTitle}>👤 User Information</Text>

            <View style={styles.infoRow}>
              <MaterialIcons
                name="person"
                size={20}
                color={Colors.light.primary}
              />
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>
                {user.nickname || "Not provided"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons
                name="email"
                size={20}
                color={Colors.light.primary}
              />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>

            {user.phone && (
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="phone"
                  size={20}
                  color={Colors.light.primary}
                />
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{user.phone}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <MaterialIcons
                name="schedule"
                size={20}
                color={Colors.light.primary}
              />
              <Text style={styles.infoLabel}>Submitted:</Text>
              <Text style={styles.infoValue}>
                {formatDate(user.created_at)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons
                name={user.id_type === "school_id" ? "school" : "credit-card"}
                size={20}
                color={Colors.light.primary}
              />
              <Text style={styles.infoLabel}>ID Type:</Text>
              <Text style={styles.infoValue}>
                {user.id_type === "school_id" ? "School ID" : "National ID"}
              </Text>
            </View>

            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>
                ⏳ Waiting for {user.days_waiting} days
              </Text>
            </View>
          </TeaKECard>

          {/* ID Image */}
          <TeaKECard style={styles.imageCard}>
            <Text style={styles.sectionTitle}>🆔 ID Image</Text>

            <View style={styles.imageContainer}>
              {imageLoading ? (
                <View style={styles.imageLoading}>
                  <ActivityIndicator
                    size="large"
                    color={Colors.light.primary}
                  />
                  <Text style={styles.loadingText}>Loading image...</Text>
                </View>
              ) : imageUrl && !imageError ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.idImage}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error(
                      "[UserApprovalModal] Image load error:",
                      error
                    );

                    // Check for different types of image errors
                    const nativeEvent = error?.nativeEvent as any;
                    const errorMessage = nativeEvent?.error || "";

                    if (
                      errorMessage.includes("empty") ||
                      errorMessage.includes("0 bytes")
                    ) {
                      setImageError(
                        "Image file is empty (0 bytes). The upload may have failed."
                      );
                    } else if (
                      errorMessage.includes("download") ||
                      errorMessage.includes("network")
                    ) {
                      setImageError(
                        "Image download failed. The file may be corrupted or inaccessible."
                      );
                    } else if (
                      errorMessage.includes("404") ||
                      errorMessage.includes("not found")
                    ) {
                      setImageError(
                        "Image not found. The file may have been deleted or moved."
                      );
                    } else {
                      setImageError(
                        "Failed to load image. Please check if the file exists and is valid."
                      );
                    }
                  }}
                />
              ) : (
                <View style={styles.imageError}>
                  <MaterialIcons
                    name="image-not-supported"
                    size={48}
                    color={Colors.light.textSecondary}
                  />
                  <Text style={styles.errorText}>
                    {imageError ||
                      (user?.id_image_url
                        ? "Failed to load image from private storage"
                        : "No image URL provided")}
                  </Text>
                  {imageError && imageError.includes("empty") && (
                    <Text style={styles.errorHint}>
                      💡 The user may need to re-upload their ID image
                    </Text>
                  )}
                </View>
              )}
            </View>
          </TeaKECard>

          {/* Approval Decision */}
          <TeaKECard style={styles.decisionCard}>
            <Text style={styles.sectionTitle}>⚖️ Decision</Text>

            <View style={styles.toggleContainer}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleOption}>
                  <Text
                    style={[
                      styles.toggleLabel,
                      approvalDecision === false && styles.activeReject,
                    ]}
                  >
                    Reject
                  </Text>
                  <MaterialIcons
                    name="cancel"
                    size={24}
                    color={
                      approvalDecision === false
                        ? "#F25F5C"
                        : Colors.light.textSecondary
                    }
                  />
                </View>

                <Switch
                  value={approvalDecision === true}
                  onValueChange={handleApprovalToggle}
                  trackColor={{ false: "#F25F5C", true: "#76C893" }}
                  thumbColor={Colors.light.background}
                  style={styles.switch}
                />

                <View style={styles.toggleOption}>
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color={
                      approvalDecision === true
                        ? "#76C893"
                        : Colors.light.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.toggleLabel,
                      approvalDecision === true && styles.activeApprove,
                    ]}
                  >
                    Approve
                  </Text>
                </View>
              </View>
            </View>

            {approvalDecision !== null && (
              <TeaKEButton
                title={
                  processing ? "Processing..." : `Confirm ${getDecisionText()}`
                }
                onPress={handleConfirmDecision}
                disabled={processing}
                variant={approvalDecision ? "primary" : "danger"}
                style={{
                  ...styles.confirmButton,
                  backgroundColor: getDecisionColor(),
                }}
              />
            )}

            {imageError && imageError.includes("empty") && (
              <TeaKEButton
                title="Reject - Request Re-upload"
                onPress={() => {
                  setApprovalDecision(false);
                  // Auto-confirm rejection for empty files
                  setTimeout(() => {
                    handleRejectWithReason(
                      "Image file is empty (0 bytes). Please re-upload your ID image."
                    );
                  }, 100);
                }}
                disabled={processing}
                variant="secondary"
                style={{
                  ...styles.confirmButton,
                  backgroundColor: "#FFA500",
                  marginTop: Spacing.sm,
                }}
              />
            )}
          </TeaKECard>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  userInfoCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginLeft: Spacing.sm,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  waitingContainer: {
    backgroundColor: Colors.light.accent,
    padding: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  waitingText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: "500",
    textAlign: "center",
  },
  imageCard: {
    marginBottom: Spacing.sm,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.light.accent,
    aspectRatio: 1.6,
    justifyContent: "center",
    alignItems: "center",
  },
  idImage: {
    width: "100%",
    height: "100%",
  },

  imageError: {
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  errorHint: {
    fontSize: 12,
    color: Colors.light.primary,
    marginTop: Spacing.xs,
    textAlign: "center",
    fontStyle: "italic",
  },
  imageLoading: {
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },

  decisionCard: {
    marginBottom: Spacing.xl,
  },
  toggleContainer: {
    marginBottom: Spacing.lg,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  toggleOption: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: "500",
    marginHorizontal: Spacing.sm,
  },
  activeApprove: {
    color: "#76C893",
  },
  activeReject: {
    color: "#F25F5C",
  },
  switch: {
    marginHorizontal: Spacing.lg,
  },
  confirmButton: {
    marginTop: Spacing.md,
  },
});
