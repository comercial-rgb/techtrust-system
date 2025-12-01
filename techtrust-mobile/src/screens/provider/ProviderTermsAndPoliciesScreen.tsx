/**
 * ProviderTermsAndPoliciesScreen - Termos e Políticas para Prestadores
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

type TabType = 'terms' | 'privacy' | 'contract' | 'fees';

export default function ProviderTermsAndPoliciesScreen({ navigation }: any) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('terms');

  const tabs = [
    { key: 'terms' as TabType, label: t.provider?.terms || 'Terms', icon: 'file-document' },
    { key: 'privacy' as TabType, label: t.provider?.privacy || 'Privacy', icon: 'shield-account' },
    { key: 'contract' as TabType, label: t.provider?.contract || 'Contract', icon: 'handshake' },
    { key: 'fees' as TabType, label: t.provider?.fees || 'Fees', icon: 'percent' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'terms':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Termos de Uso - Prestadores</Text>
            <Text style={styles.lastUpdated}>Última atualização: Janeiro 2024</Text>

            <Text style={styles.sectionHeading}>1. Cadastro e Elegibilidade</Text>
            <Text style={styles.paragraph}>
              Para se cadastrar como prestador de serviços na plataforma TechTrust, você deve:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Ser maior de 18 anos</Text>
              <Text style={styles.bulletItem}>• Possuir CNPJ ou MEI ativo</Text>
              <Text style={styles.bulletItem}>• Ter experiência comprovada na área automotiva</Text>
              <Text style={styles.bulletItem}>• Aceitar todos os termos desta plataforma</Text>
            </View>

            <Text style={styles.sectionHeading}>2. Obrigações do Prestador</Text>
            <Text style={styles.paragraph}>
              O prestador se compromete a:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Prestar serviços de qualidade</Text>
              <Text style={styles.bulletItem}>• Cumprir prazos acordados</Text>
              <Text style={styles.bulletItem}>• Utilizar peças de procedência garantida</Text>
              <Text style={styles.bulletItem}>• Manter comunicação clara com o cliente</Text>
              <Text style={styles.bulletItem}>• Emitir nota fiscal quando solicitado</Text>
              <Text style={styles.bulletItem}>• Responder às solicitações em tempo hábil</Text>
            </View>

            <Text style={styles.sectionHeading}>3. Qualidade do Serviço</Text>
            <Text style={styles.paragraph}>
              A TechTrust preza pela excelência. Prestadores que mantiverem 
              avaliação abaixo de 3.5 estrelas por mais de 30 dias consecutivos 
              poderão ter suas contas suspensas para análise.
            </Text>

            <Text style={styles.sectionHeading}>4. Cancelamentos</Text>
            <Text style={styles.paragraph}>
              Cancelamentos frequentes afetam negativamente sua reputação na 
              plataforma. Taxas de cancelamento elevadas podem resultar em 
              penalidades ou suspensão.
            </Text>
          </View>
        );

      case 'privacy':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Política de Privacidade</Text>
            <Text style={styles.lastUpdated}>Última atualização: Janeiro 2024</Text>

            <Text style={styles.sectionHeading}>1. Dados Coletados</Text>
            <Text style={styles.paragraph}>
              Coletamos as seguintes informações dos prestadores:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Dados pessoais e empresariais</Text>
              <Text style={styles.bulletItem}>• CNPJ/CPF e documentação</Text>
              <Text style={styles.bulletItem}>• Endereço e área de atuação</Text>
              <Text style={styles.bulletItem}>• Dados bancários para pagamentos</Text>
              <Text style={styles.bulletItem}>• Histórico de serviços realizados</Text>
              <Text style={styles.bulletItem}>• Avaliações e feedbacks recebidos</Text>
            </View>

            <Text style={styles.sectionHeading}>2. Uso dos Dados</Text>
            <Text style={styles.paragraph}>
              Seus dados são utilizados para:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Conectar você aos clientes</Text>
              <Text style={styles.bulletItem}>• Processar pagamentos</Text>
              <Text style={styles.bulletItem}>• Melhorar nossos serviços</Text>
              <Text style={styles.bulletItem}>• Comunicações sobre a plataforma</Text>
              <Text style={styles.bulletItem}>• Cumprimento de obrigações legais</Text>
            </View>

            <Text style={styles.sectionHeading}>3. Proteção de Dados</Text>
            <Text style={styles.paragraph}>
              Utilizamos criptografia e medidas de segurança avançadas para 
              proteger todas as informações. Seus dados bancários são 
              armazenados com os mais altos padrões de segurança.
            </Text>

            <Text style={styles.sectionHeading}>4. LGPD</Text>
            <Text style={styles.paragraph}>
              Estamos em conformidade com a Lei Geral de Proteção de Dados. 
              Você pode solicitar acesso, correção ou exclusão dos seus dados 
              a qualquer momento através do suporte.
            </Text>
          </View>
        );

      case 'contract':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Contrato de Parceria</Text>
            <Text style={styles.lastUpdated}>Última atualização: Janeiro 2024</Text>

            <Text style={styles.sectionHeading}>1. Objeto do Contrato</Text>
            <Text style={styles.paragraph}>
              Este contrato estabelece os termos da parceria entre o prestador 
              de serviços automotivos e a plataforma TechTrust para 
              intermediação de serviços.
            </Text>

            <Text style={styles.sectionHeading}>2. Responsabilidades</Text>
            <Text style={styles.paragraph}>
              A TechTrust atua como intermediadora, conectando prestadores a 
              clientes. A execução do serviço é de responsabilidade exclusiva 
              do prestador, incluindo garantias e suporte pós-serviço.
            </Text>

            <Text style={styles.sectionHeading}>3. Exclusividade</Text>
            <Text style={styles.paragraph}>
              Não há cláusula de exclusividade. Você pode atuar em outras 
              plataformas ou de forma independente. Porém, serviços iniciados 
              pela TechTrust devem ser concluídos pela plataforma.
            </Text>

            <Text style={styles.sectionHeading}>4. Rescisão</Text>
            <Text style={styles.paragraph}>
              Ambas as partes podem encerrar a parceria a qualquer momento. 
              Pagamentos pendentes serão processados normalmente. A TechTrust 
              pode suspender contas por violação dos termos.
            </Text>

            <Text style={styles.sectionHeading}>5. Propriedade Intelectual</Text>
            <Text style={styles.paragraph}>
              O uso da marca TechTrust é permitido apenas para divulgação da 
              parceria, conforme diretrizes fornecidas. Materiais de marketing 
              devem ser aprovados previamente.
            </Text>
          </View>
        );

      case 'fees':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Política de Taxas</Text>
            <Text style={styles.lastUpdated}>Última atualização: Janeiro 2024</Text>

            <View style={styles.feeCard}>
              <View style={styles.feeHeader}>
                <MaterialCommunityIcons name="percent" size={24} color="#1976d2" />
                <Text style={styles.feeTitle}>Taxa de Serviço</Text>
              </View>
              <Text style={styles.feeValue}>10%</Text>
              <Text style={styles.feeDescription}>
                Sobre o valor total do serviço
              </Text>
            </View>

            <Text style={styles.sectionHeading}>1. Como Funciona</Text>
            <Text style={styles.paragraph}>
              A TechTrust cobra uma taxa de 10% sobre o valor total de cada 
              serviço concluído. Esta taxa é descontada automaticamente no 
              momento do repasse.
            </Text>

            <Text style={styles.sectionHeading}>2. O Que Está Incluso</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Acesso à plataforma e aplicativo</Text>
              <Text style={styles.bulletItem}>• Sistema de pagamentos online</Text>
              <Text style={styles.bulletItem}>• Suporte ao cliente 24/7</Text>
              <Text style={styles.bulletItem}>• Marketing e captação de clientes</Text>
              <Text style={styles.bulletItem}>• Sistema de avaliações</Text>
              <Text style={styles.bulletItem}>• Proteção contra fraudes</Text>
            </View>

            <Text style={styles.sectionHeading}>3. Pagamentos</Text>
            <Text style={styles.paragraph}>
              Os repasses são realizados em até 2 dias úteis após a conclusão 
              e confirmação do serviço pelo cliente. Em caso de parcelamento, 
              o valor é repassado conforme as parcelas são confirmadas.
            </Text>

            <Text style={styles.sectionHeading}>4. Descontos por Volume</Text>
            <View style={styles.tierCard}>
              <View style={styles.tierRow}>
                <Text style={styles.tierLabel}>Até 10 serviços/mês</Text>
                <Text style={styles.tierValue}>10%</Text>
              </View>
              <View style={styles.tierRow}>
                <Text style={styles.tierLabel}>11-30 serviços/mês</Text>
                <Text style={styles.tierValue}>9%</Text>
              </View>
              <View style={styles.tierRow}>
                <Text style={styles.tierLabel}>31+ serviços/mês</Text>
                <Text style={styles.tierValue}>8%</Text>
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.termsAndPolicies || 'Terms and Policies'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.key ? '#1976d2' : '#6b7280'}
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderContent()}
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
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#dbeafe',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#1976d2',
  },
  contentContainer: {
    padding: 20,
  },
  contentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
  bulletList: {
    marginTop: 8,
    marginLeft: 8,
  },
  bulletItem: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 24,
  },
  feeCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  feeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  feeValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1976d2',
  },
  feeDescription: {
    fontSize: 14,
    color: '#1e40af',
  },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tierLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  tierValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
});
