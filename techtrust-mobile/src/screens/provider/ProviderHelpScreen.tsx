/**
 * ProviderHelpScreen - Central de Ajuda
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  color: string;
  backgroundColor: string;
}

export default function ProviderHelpScreen({ navigation }: any) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const helpCategories: HelpCategory[] = [
    { id: '1', title: 'Primeiros Passos', icon: 'rocket-launch', color: '#1976d2', backgroundColor: '#dbeafe' },
    { id: '2', title: 'Orçamentos', icon: 'file-document-edit', color: '#16a34a', backgroundColor: '#dcfce7' },
    { id: '3', title: 'Pagamentos', icon: 'cash-multiple', color: '#d97706', backgroundColor: '#fef3c7' },
    { id: '4', title: 'Ordens de Serviço', icon: 'clipboard-list', color: '#8b5cf6', backgroundColor: '#ede9fe' },
    { id: '5', title: 'Avaliações', icon: 'star', color: '#ec4899', backgroundColor: '#fce7f3' },
    { id: '6', title: 'Configurações', icon: 'cog', color: '#6b7280', backgroundColor: '#f3f4f6' },
  ];

  const faqItems: FAQItem[] = [
    {
      id: '1',
      category: 'Orçamentos',
      question: 'Como criar um orçamento para um cliente?',
      answer: 'Para criar um orçamento, acesse a solicitação do cliente, clique em "Criar Orçamento" e preencha os campos de peças e serviços. Você pode adicionar múltiplos itens e o sistema calculará automaticamente o valor total.',
    },
    {
      id: '2',
      category: 'Pagamentos',
      question: 'Quando recebo o pagamento pelos serviços?',
      answer: 'O pagamento é processado automaticamente em até 2 dias úteis após a conclusão do serviço. O valor será depositado na conta bancária cadastrada, com desconto de 10% de taxa da plataforma.',
    },
    {
      id: '3',
      category: 'Orçamentos',
      question: 'Posso alterar um orçamento já enviado?',
      answer: 'Sim, enquanto o cliente não aceitar o orçamento, você pode editá-lo. Após a aceitação, qualquer alteração deve ser acordada com o cliente e um novo orçamento deve ser enviado.',
    },
    {
      id: '4',
      category: 'Ordens de Serviço',
      question: 'Como finalizar uma ordem de serviço?',
      answer: 'Após concluir o serviço, acesse a ordem, clique em "Finalizar" e adicione fotos do trabalho realizado. O cliente receberá uma notificação e poderá avaliar o serviço.',
    },
    {
      id: '5',
      category: 'Avaliações',
      question: 'Como funcionam as avaliações?',
      answer: 'Após cada serviço finalizado, o cliente pode avaliar de 1 a 5 estrelas e deixar um comentário. Sua média de avaliações é exibida no seu perfil e influencia no ranking de busca.',
    },
    {
      id: '6',
      category: 'Pagamentos',
      question: 'Por que foi cobrada uma taxa de 10%?',
      answer: 'A taxa de 10% é a comissão da plataforma que cobre custos de processamento de pagamento, suporte ao cliente, marketing e manutenção do aplicativo.',
    },
  ];

  const filteredFAQs = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.helpCenter || 'Help Center'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={22} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t.common?.searchHelp || 'Search help...'}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Help Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.common?.categories || 'Categories'}</Text>
          <View style={styles.categoriesGrid}>
            {helpCategories.map(category => (
              <TouchableOpacity key={category.id} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: category.backgroundColor }]}>
                  <MaterialCommunityIcons 
                    name={category.icon as any} 
                    size={24} 
                    color={category.color} 
                  />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.faq || 'Frequently Asked Questions'}</Text>
          <View style={styles.faqList}>
            {filteredFAQs.map(item => (
              <TouchableOpacity 
                key={item.id}
                style={styles.faqCard}
                onPress={() => toggleFAQ(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqCategory}>{item.category}</Text>
                  <MaterialCommunityIcons 
                    name={expandedFAQ === item.id ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#6b7280" 
                  />
                </View>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                {expandedFAQ === item.id && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.needMoreHelp || 'Need more help?'}</Text>
          <View style={styles.contactOptions}>
            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => navigation.navigate('SupportChat')}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#dbeafe' }]}>
                <MaterialCommunityIcons name="chat" size={24} color="#1976d2" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{t.provider?.chatWithSupport || 'Chat with Support'}</Text>
                <Text style={styles.contactSubtitle}>{t.provider?.responseTime || 'Response in up to 5 minutes'}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard}>
              <View style={[styles.contactIcon, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="email" size={24} color="#16a34a" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{t.provider?.sendEmail || 'Send Email'}</Text>
                <Text style={styles.contactSubtitle}>suporte@techtrust.com.br</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard}>
              <View style={[styles.contactIcon, { backgroundColor: '#fef3c7' }]}>
                <MaterialCommunityIcons name="phone" size={24} color="#d97706" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{t.provider?.call || 'Call'}</Text>
                <Text style={styles.contactSubtitle}>0800 123 4567</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.common?.resources || 'Resources'}</Text>
          <View style={styles.resourcesList}>
            <TouchableOpacity style={styles.resourceCard}>
              <MaterialCommunityIcons name="book-open-variant" size={24} color="#1976d2" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{t.provider?.providerGuide || 'Provider Guide'}</Text>
                <Text style={styles.resourceSubtitle}>{t.provider?.learnPlatform || 'Learn everything about the platform'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <MaterialCommunityIcons name="video" size={24} color="#1976d2" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{t.provider?.videoTutorials || 'Video Tutorials'}</Text>
                <Text style={styles.resourceSubtitle}>{t.provider?.watchDemos || 'Watch video demonstrations'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <MaterialCommunityIcons name="lightbulb-on" size={24} color="#1976d2" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{t.provider?.successTips || 'Success Tips'}</Text>
                <Text style={styles.resourceSubtitle}>{t.provider?.increaseEarnings || 'How to increase your earnings'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
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
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  faqCategory: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  contactOptions: {
    gap: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  contactSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  resourcesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  resourceSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});
