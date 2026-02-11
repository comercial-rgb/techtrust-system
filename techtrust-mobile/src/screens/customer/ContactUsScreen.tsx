/**
 * ContactUsScreen - Fale Conosco (Chat com Suporte)
 * Redirects to the real SupportChatScreen with ticket system
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';

export default function ContactUsScreen({ navigation }: any) {
  const { t } = useI18n();

  const contactOptions = [
    {
      icon: 'chatbubbles-outline' as const,
      title: t.customer?.liveChat || 'Live Chat Support',
      description: t.customer?.liveChatDesc || 'Chat with our support team in real-time',
      onPress: () => navigation.navigate('SupportChat'),
    },
    {
      icon: 'mail-outline' as const,
      title: t.customer?.email || 'Email',
      description: 'support@techtrust.app',
      onPress: () => {},
    },
    {
      icon: 'call-outline' as const,
      title: t.customer?.phone || 'Phone',
      description: '+1 (407) 900-0000',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.customer?.contactUs || 'Contact Us'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="headset" size={48} color="#1976d2" />
          </View>
          <Text style={styles.heroTitle}>{t.customer?.howCanWeHelp || 'How can we help you?'}</Text>
          <Text style={styles.heroSubtitle}>
            {t.customer?.supportDescription || 'Choose how you\'d like to reach us. Our team is available to help you.'}
          </Text>
        </View>

        {contactOptions.map((option, index) => (
          <TouchableOpacity key={index} style={styles.optionCard} onPress={option.onPress}>
            <View style={styles.optionIcon}>
              <Ionicons name={option.icon} size={24} color="#1976d2" />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        {/* Start Chat Button */}
        <TouchableOpacity 
          style={styles.startChatBtn} 
          onPress={() => navigation.navigate('SupportChat')}
        >
          <Ionicons name="chatbubbles" size={20} color="#fff" />
          <Text style={styles.startChatText}>{t.customer?.startChat || 'Start Live Chat'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  content: { padding: 16 },
  heroSection: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  optionDescription: { fontSize: 13, color: '#6b7280' },
  startChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  startChatText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
