import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useI18n } from "../i18n";
import { useAuth } from "../contexts/AuthContext";
import {
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
} from "../services/authService";

const ACCOUNT_TYPES = [
  {
    key: "CLIENT" as const,
    icon: "car-sport-outline",
    activeIcon: "car-sport",
    color: "#2B5EA7",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    title: "Customer",
    titlePt: "Cliente",
    subtitle: "I need auto services",
    subtitlePt: "Preciso de serviços automotivos",
    bullets: [
      "Request repairs, maintenance & roadside help",
      "Get quotes from nearby providers",
      "Track service history & vehicle health",
      "Manage payments securely",
    ],
    bulletsPt: [
      "Solicite reparos, manutenção e assistência",
      "Receba orçamentos de prestadores próximos",
      "Histórico de serviços e saúde do veículo",
      "Pagamentos seguros e rastreáveis",
    ],
  },
  {
    key: "PROVIDER" as const,
    icon: "construct-outline",
    activeIcon: "construct",
    color: "#0f766e",
    bgColor: "#f0fdfa",
    borderColor: "#99f6e4",
    title: "Service Provider",
    titlePt: "Prestador de Serviços",
    subtitle: "I offer auto repair & maintenance",
    subtitlePt: "Ofereço reparo e manutenção",
    bullets: [
      "Receive service requests from nearby customers",
      "Send quotes & manage work orders",
      "Process payments & track earnings",
      "Build your reputation with verified reviews",
    ],
    bulletsPt: [
      "Receba solicitações de clientes próximos",
      "Envie orçamentos e gerencie ordens de serviço",
      "Processe pagamentos e acompanhe ganhos",
      "Construa reputação com avaliações verificadas",
    ],
  },
  {
    key: "MARKETPLACE" as const,
    icon: "storefront-outline",
    activeIcon: "storefront",
    color: "#0891b2",
    bgColor: "#f0fdff",
    borderColor: "#a5f3fc",
    title: "Marketplace",
    titlePt: "Marketplace",
    subtitle: "Car wash or auto parts store",
    subtitlePt: "Lava-rápido ou loja de autopeças",
    bullets: [
      "List your car wash or auto parts store",
      "Receive online bookings & orders",
      "Manage inventory & promotions",
      "Expand your customer base digitally",
    ],
    bulletsPt: [
      "Cadastre seu lava-rápido ou loja de peças",
      "Receba agendamentos e pedidos online",
      "Gerencie estoque e promoções",
      "Expanda sua base de clientes digitalmente",
    ],
  },
] as const;

type Role = (typeof ACCOUNT_TYPES)[number]["key"];

export default function AccountTypeScreen({ navigation }: any) {
  const theme = useTheme();
  const { language, t } = useI18n();
  const { socialLogin } = useAuth();
  const isPt = language === "pt";

  const [showSocialModal, setShowSocialModal] = useState(false);
  const [pendingSocialProvider, setPendingSocialProvider] = useState<"google" | "apple" | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = React.useState(false);

  React.useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  function handleSelect(role: Role) {
    navigation.navigate("Signup", { initialRole: role });
  }

  async function handleSocialWithRole(role: "CLIENT" | "PROVIDER") {
    setShowSocialModal(false);
    if (!pendingSocialProvider) return;
    setSocialLoading(true);
    try {
      let result;
      if (pendingSocialProvider === "google") {
        const googleUser = await signInWithGoogle();
        if (!googleUser) { setSocialLoading(false); return; }
        result = await socialLogin("GOOGLE", googleUser.accessToken, { fullName: googleUser.name }, role);
      } else {
        const appleUser = await signInWithApple();
        if (!appleUser) { setSocialLoading(false); return; }
        result = await socialLogin("APPLE", appleUser.identityToken, {
          appleUserId: appleUser.id,
          fullName: appleUser.fullName || undefined,
        }, role);
      }

      if (!result) { setSocialLoading(false); return; }

      if (result.status === "AUTHENTICATED") {
        // Already logged in — AuthContext handles navigation
      } else if (result.status === "NEEDS_PASSWORD") {
        navigation.navigate("CompleteSocialSignup", {
          userId: result.userId,
          email: result.email,
          fullName: result.fullName,
          phone: result.phone,
          provider: pendingSocialProvider === "google" ? "Google" : "Apple",
        });
      }
    } catch (error: any) {
      Alert.alert(
        t.common?.error || "Error",
        error.message || t.auth?.socialSignInFailed || "Social sign-in failed. Please try again.",
      );
    } finally {
      setSocialLoading(false);
      setPendingSocialProvider(null);
    }
  }

  function openSocialModal(provider: "google" | "apple") {
    setPendingSocialProvider(provider);
    setShowSocialModal(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {isPt ? "Criar conta" : "Create account"}
          </Text>
          <Text style={styles.headerSub}>
            {isPt ? "Escolha como você vai usar o app" : "Choose how you'll use the app"}
          </Text>
        </View>
      </View>

      {/* Cards + Footer inside ScrollView */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {ACCOUNT_TYPES.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[styles.card, { borderColor: type.borderColor, backgroundColor: type.bgColor }]}
            onPress={() => handleSelect(type.key)}
            activeOpacity={0.85}
          >
            {/* Icon + Title row */}
            <View style={styles.cardTop}>
              <View style={[styles.iconCircle, { backgroundColor: type.color }]}>
                <Ionicons name={type.icon as any} size={26} color="#fff" />
              </View>
              <View style={styles.cardTitleBlock}>
                <Text style={[styles.cardTitle, { color: type.color }]}>
                  {isPt ? type.titlePt : type.title}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {isPt ? type.subtitlePt : type.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={type.color} style={{ opacity: 0.6 }} />
            </View>

            {/* Bullet points */}
            <View style={styles.bullets}>
              {(isPt ? type.bulletsPt : type.bullets).map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={15} color={type.color} style={{ marginTop: 1 }} />
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {/* Social Signup Section */}
        <View style={styles.socialSection}>
          <View style={styles.socialDivider}>
            <View style={styles.socialDividerLine} />
            <Text style={styles.socialDividerText}>
              {isPt ? "ou crie uma conta com" : "or sign up with"}
            </Text>
            <View style={styles.socialDividerLine} />
          </View>

          <View style={styles.socialInfoBox}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#6b7280" />
            <Text style={styles.socialInfoText}>
              {isPt
                ? "Você escolherá o tipo de conta (cliente ou prestador) após autenticar."
                : "You'll choose your account type (customer or provider) after authenticating."}
            </Text>
          </View>

          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => openSocialModal("google")}
              disabled={socialLoading}
            >
              {socialLoading && pendingSocialProvider === "google" ? (
                <ActivityIndicator size="small" color="#ea4335" />
              ) : (
                <MaterialCommunityIcons name="google" size={20} color="#ea4335" />
              )}
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>

            {appleAvailable && (
              <TouchableOpacity
                style={[styles.socialBtn, styles.socialBtnApple]}
                onPress={() => openSocialModal("apple")}
                disabled={socialLoading}
              >
                {socialLoading && pendingSocialProvider === "apple" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="apple" size={20} color="#fff" />
                )}
                <Text style={[styles.socialBtnText, { color: "#fff" }]}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Footer — always 32px below last card */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isPt ? "Já tem uma conta? " : "Already have an account? "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
              {isPt ? "Entrar" : "Sign in"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Role selection modal for social signup */}
      <Modal
        visible={showSocialModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSocialModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSocialModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {isPt ? "Você é..." : "I am a..."}
            </Text>
            <Text style={styles.modalSub}>
              {isPt
                ? "Escolha como usará o app com esta conta social."
                : "Choose how you'll use the app with this social account."}
            </Text>

            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => handleSocialWithRole("CLIENT")}
            >
              <View style={[styles.roleIcon, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="car-sport-outline" size={26} color="#2B5EA7" />
              </View>
              <View style={styles.roleText}>
                <Text style={styles.roleTitle}>{isPt ? "Cliente" : "Customer"}</Text>
                <Text style={styles.roleSub}>{isPt ? "Preciso de serviços automotivos" : "I need auto services"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => handleSocialWithRole("PROVIDER")}
            >
              <View style={[styles.roleIcon, { backgroundColor: "#f0fdfa" }]}>
                <Ionicons name="construct-outline" size={26} color="#0f766e" />
              </View>
              <View style={styles.roleText}>
                <Text style={styles.roleTitle}>{isPt ? "Prestador" : "Service Provider"}</Text>
                <Text style={styles.roleSub}>{isPt ? "Ofereço reparo e manutenção" : "I offer auto repair & services"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowSocialModal(false)}>
              <Text style={styles.modalCancelText}>{isPt ? "Cancelar" : "Cancel"}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 8,
    paddingBottom: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSub: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 14,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  bullets: {
    gap: 7,
    paddingLeft: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  footerText: {
    fontSize: 14,
    color: "#6b7280",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
  socialSection: {
    paddingTop: 8,
  },
  socialDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  socialDividerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  socialInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  socialInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 17,
  },
  socialButtons: {
    flexDirection: "row",
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  socialBtnApple: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    gap: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  modalSub: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginTop: -8,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  roleIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  roleText: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  roleSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  modalCancel: {
    alignItems: "center",
    paddingVertical: 12,
  },
  modalCancelText: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
  },
});
