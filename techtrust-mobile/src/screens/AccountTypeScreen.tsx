import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useI18n } from "../i18n";

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
  const { language } = useI18n();
  const isPt = language === "pt";

  function handleSelect(role: Role) {
    navigation.navigate("Signup", { initialRole: role });
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
});
