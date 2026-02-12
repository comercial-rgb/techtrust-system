/**
 * RepairInvoicesScreen - List repair invoices
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as fdacsService from '../../services/fdacs.service';

export default function RepairInvoicesScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<fdacsService.RepairInvoice[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [])
  );

  async function loadInvoices() {
    try {
      setLoading(true);
      const res = await fdacsService.getMyInvoices();
      setInvoices(res.data?.invoices || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'DRAFT': return { label: 'Draft', color: '#6b7280', bgColor: '#f3f4f6' };
      case 'IN_PROGRESS': return { label: 'In Progress', color: '#3b82f6', bgColor: '#dbeafe' };
      case 'COMPLETED': return { label: 'Ready for Review', color: '#f59e0b', bgColor: '#fef3c7' };
      case 'APPROVED': return { label: 'Approved', color: '#10b981', bgColor: '#d1fae5' };
      case 'DISPUTED': return { label: 'Disputed', color: '#ef4444', bgColor: '#fee2e2' };
      default: return { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
    }
  };

  const renderInvoice = ({ item }: { item: fdacsService.RepairInvoice }) => {
    const statusInfo = getStatusInfo(item.status);
    const hasSupplement = Number(item.supplementsTotal) > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RepairInvoiceDetails', { invoiceId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        <Text style={styles.vehicleInfo}>{item.vehicleInfo}</Text>

        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>Original</Text>
            <Text style={styles.amountValue}>${Number(item.originalTotal).toFixed(2)}</Text>
          </View>
          {hasSupplement && (
            <View>
              <Text style={styles.amountLabel}>Supplements</Text>
              <Text style={[styles.amountValue, { color: '#f59e0b' }]}>
                +${Number(item.supplementsTotal).toFixed(2)}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.amountLabel}>Final Total</Text>
            <Text style={[styles.amountValue, { color: '#10b981', fontWeight: '700' }]}>
              ${Number(item.finalTotal).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            {item.providerBusinessName || item.providerName}
          </Text>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Repair Invoices</Text>
        <View style={{ width: 24 }} />
      </View>

      {invoices.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No invoices yet</Text>
          <Text style={styles.emptyText}>
            Repair invoices are generated automatically when a Written Estimate is approved.
          </Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          renderItem={renderInvoice}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceNumber: { fontSize: 14, fontWeight: '600', color: '#1976d2' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  vehicleInfo: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 12 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  amountLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 },
  amountValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoText: { fontSize: 13, color: '#374151' },
  dateText: { fontSize: 13, color: '#6b7280' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
});
