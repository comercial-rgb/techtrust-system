/**
 * WorkOrderDetailsScreen - Detalhes do Serviço
 * Com dados mockados
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';

export default function WorkOrderDetailsScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const { workOrderId } = route.params || { workOrderId: '1' };
  const [loading, setLoading] = useState(true);
  const [workOrder, setWorkOrder] = useState<any>(null);

  useEffect(() => { loadDetails(); }, []);

  async function loadDetails() {
    await new Promise(resolve => setTimeout(resolve, 800));
    setWorkOrder({
      id: workOrderId,
      orderNumber: 'WO-2024-001',
      title: 'Revisão completa 30k',
      status: 'IN_PROGRESS',
      finalAmount: 450,
      partsCost: 200,
      laborCost: 250,
      estimatedTime: '3 horas',
      description: 'Revisão preventiva completa dos 30.000 km incluindo troca de óleo, filtros, verificação de freios e suspensão.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      provider: { businessName: 'Auto Center Express', phone: '(11) 99999-9999', rating: 4.8, address: 'Rua das Oficinas, 123' },
      vehicle: { make: 'Toyota', model: 'Corolla', year: 2019, plateNumber: 'XYZ5678' },
      timeline: [
        { status: 'CREATED', label: 'Orçamento aceito', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { status: 'STARTED', label: 'Serviço iniciado', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      ],
    });
    setLoading(false);
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING_START': return { label: t.workOrder?.awaitingStart || 'Aguardando Início', color: '#f59e0b', bgColor: '#fef3c7' };
      case 'IN_PROGRESS': return { label: t.workOrder?.inProgress || 'Em Andamento', color: '#3b82f6', bgColor: '#dbeafe' };
      case 'AWAITING_PAYMENT': return { label: t.workOrder?.awaitingPayment || 'Aguardando Pagamento', color: '#8b5cf6', bgColor: '#ede9fe' };
      case 'COMPLETED': return { label: t.workOrder?.completed || 'Concluído', color: '#10b981', bgColor: '#d1fae5' };
      default: return { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><View style={styles.loading}><Text>{t.common?.loading || 'Carregando...'}</Text></View></SafeAreaView>;
  }

  const statusInfo = getStatusInfo(workOrder?.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.workOrder?.serviceDetails || 'Detalhes do Serviço'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name="construct" size={20} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
          <Text style={styles.orderNumber}>#{workOrder?.orderNumber}</Text>
        </View>

        {/* Service Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.workOrder?.service || 'Serviço'}</Text>
          <Text style={styles.serviceTitle}>{workOrder?.title}</Text>
          <Text style={styles.serviceDescription}>{workOrder?.description}</Text>
        </View>

        {/* Provider Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.workOrder?.provider || 'Fornecedor'}</Text>
          <View style={styles.providerRow}>
            <View style={styles.providerAvatar}><Ionicons name="business" size={24} color="#1976d2" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.providerName}>{workOrder?.provider.businessName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#fbbf24" />
                <Text style={styles.ratingText}>{workOrder?.provider.rating}</Text>
              </View>
            </View>
          </View>
          <View style={styles.providerDetails}>
            <View style={styles.providerDetailRow}>
              <Ionicons name="call" size={16} color="#6b7280" />
              <Text style={styles.providerDetailText}>{workOrder?.provider.phone}</Text>
            </View>
            <View style={styles.providerDetailRow}>
              <Ionicons name="location" size={16} color="#6b7280" />
              <Text style={styles.providerDetailText}>{workOrder?.provider.address}</Text>
            </View>
          </View>
          <View style={styles.providerActions}>
            <TouchableOpacity style={styles.callBtn}><Ionicons name="call" size={18} color="#1976d2" /><Text style={styles.callText}>{t.common?.call || 'Ligar'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.chatBtn}><Ionicons name="chatbubble" size={18} color="#25D366" /><Text style={styles.chatText}>WhatsApp</Text></TouchableOpacity>
          </View>
        </View>

        {/* Vehicle Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.workOrder?.vehicle || 'Veículo'}</Text>
          <View style={styles.vehicleRow}>
            <Ionicons name="car" size={20} color="#6b7280" />
            <Text style={styles.vehicleText}>{workOrder?.vehicle.make} {workOrder?.vehicle.model} {workOrder?.vehicle.year}</Text>
          </View>
          <Text style={styles.plateText}>{t.vehicle?.plate || 'Placa'}: {workOrder?.vehicle.plateNumber}</Text>
        </View>

        {/* Price Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.workOrder?.values || 'Valores'}</Text>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>{t.workOrder?.parts || 'Peças'}</Text><Text style={styles.priceValue}>${workOrder?.partsCost}</Text></View>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>{t.workOrder?.labor || 'Mão de obra'}</Text><Text style={styles.priceValue}>${workOrder?.laborCost}</Text></View>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>{t.workOrder?.estimatedTime || 'Tempo estimado'}</Text><Text style={styles.priceValue}>{workOrder?.estimatedTime}</Text></View>
          <View style={[styles.priceRow, styles.totalRow]}><Text style={styles.totalLabel}>{t.common?.total || 'Total'}</Text><Text style={styles.totalValue}>${workOrder?.finalAmount}</Text></View>
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.workOrder?.history || 'Histórico'}</Text>
          {workOrder?.timeline.map((item: any, idx: number) => (
            <View key={idx} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>{item.label}</Text>
                <Text style={styles.timelineDate}>{new Date(item.date).toLocaleDateString('pt-BR')}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Button */}
        {workOrder?.status === 'AWAITING_PAYMENT' && (
          <TouchableOpacity style={styles.payBtn} onPress={() => navigation.navigate('Payment', { workOrderId })}>
            <Ionicons name="card" size={20} color="#fff" />
            <Text style={styles.payText}>{t.workOrder?.makePayment || 'Efetuar Pagamento'}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  statusCard: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 16, alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statusText: { fontSize: 14, fontWeight: '600' },
  orderNumber: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase' },
  serviceTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  serviceDescription: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  providerAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  providerName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 13, color: '#6b7280' },
  providerDetails: { marginBottom: 12 },
  providerDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  providerDetailText: { fontSize: 14, color: '#374151' },
  providerActions: { flexDirection: 'row', gap: 12 },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#dbeafe', paddingVertical: 10, borderRadius: 10 },
  callText: { fontSize: 14, fontWeight: '600', color: '#1976d2' },
  chatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#dcfce7', paddingVertical: 10, borderRadius: 10 },
  chatText: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  vehicleText: { fontSize: 16, fontWeight: '500', color: '#111827' },
  plateText: { fontSize: 14, color: '#6b7280' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: '#6b7280' },
  priceValue: { fontSize: 14, color: '#374151', fontWeight: '500' },
  totalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', marginBottom: 0 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#1976d2' },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1976d2', marginRight: 12, marginTop: 4 },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 14, fontWeight: '500', color: '#111827' },
  timelineDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#8b5cf6', marginHorizontal: 16, paddingVertical: 16, borderRadius: 12 },
  payText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
