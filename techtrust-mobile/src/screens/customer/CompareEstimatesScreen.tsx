/**
 * CompareEstimatesScreen - Side-by-side comparison of original + competing estimates
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as fdacsService from '../../services/fdacs.service';

export default function CompareEstimatesScreen({ route, navigation }: any) {
  const { shareId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [shareId])
  );

  async function loadDetail() {
    try {
      setLoading(true);
      const res = await fdacsService.getSharedEstimateDetail(shareId);
      setShare(res.data?.share || null);
    } catch (error) {
      console.error('Error loading shared estimate:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseSharing() {
    Alert.alert(
      'Close Sharing',
      'No more providers will be able to submit competing quotes. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close', style: 'destructive',
          onPress: async () => {
            try {
              await fdacsService.closeSharing(shareId);
              loadDetail();
            } catch (error) {
              Alert.alert('Error', 'Failed to close sharing');
            }
          }
        },
      ]
    );
  }

  if (loading || !share) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const original = share.originalQuote;
  const competing = share.competingQuotes || [];
  const isOwner = share.customerId === user?.id || share.customerId === (user as any)?.userId;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Compare Estimates</Text>
        {isOwner && share.status === 'OPEN' && (
          <TouchableOpacity onPress={handleCloseSharing}>
            <Ionicons name="close-circle" size={24} color="#ef4444" />
          </TouchableOpacity>
        )}
        {!(isOwner && share.status === 'OPEN') && <View style={{ width: 24 }} />}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Vehicle Info */}
        <View style={styles.vehicleCard}>
          <Ionicons name="car-outline" size={20} color="#6b7280" />
          <Text style={styles.vehicleText}>{share.vehicleInfo || 'Vehicle'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: share.status === 'OPEN' ? '#dbeafe' : '#f3f4f6' }]}>
            <Text style={[styles.statusText, { color: share.status === 'OPEN' ? '#3b82f6' : '#6b7280' }]}>
              {share.status}
            </Text>
          </View>
        </View>

        {/* Original Estimate */}
        <Text style={styles.sectionLabel}>Original Written Estimate</Text>
        <View style={[styles.estimateCard, styles.originalCard]}>
          <View style={styles.estimateHeader}>
            <View>
              <Text style={styles.estimateNumber}>{original?.estimateNumber || 'N/A'}</Text>
              <Text style={styles.providerName}>{original?.providerName || 'Original Provider'}</Text>
            </View>
            <View style={styles.originalBadge}>
              <Text style={styles.originalBadgeText}>Original</Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Estimate</Text>
            <Text style={styles.totalValue}>${Number(original?.totalAmount || 0).toFixed(2)}</Text>
          </View>

          {original?.laborCost != null && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Labor</Text>
              <Text style={styles.breakdownValue}>${Number(original.laborCost).toFixed(2)}</Text>
            </View>
          )}
          {original?.partsCost != null && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Parts</Text>
              <Text style={styles.breakdownValue}>${Number(original.partsCost).toFixed(2)}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.viewDetailBtn}
            onPress={() => navigation.navigate('QuoteDetails', { quoteId: original?.id })}
          >
            <Text style={styles.viewDetailText}>View Full Estimate</Text>
            <Ionicons name="chevron-forward" size={16} color="#1976d2" />
          </TouchableOpacity>
        </View>

        {/* Competing Estimates */}
        <Text style={styles.sectionLabel}>
          Competing Estimates ({competing.length})
        </Text>

        {competing.length === 0 ? (
          <View style={styles.emptyCompeting}>
            <Ionicons name="hourglass-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {share.status === 'OPEN'
                ? 'Waiting for providers to submit competing quotes...'
                : 'No competing estimates were received.'}
            </Text>
          </View>
        ) : (
          competing.map((cq: any, idx: number) => {
            const savings = Number(original?.totalAmount || 0) - Number(cq.totalAmount || 0);
            const savingsPercent = original?.totalAmount
              ? ((savings / Number(original.totalAmount)) * 100).toFixed(0)
              : '0';

            return (
              <View key={cq.id || idx} style={styles.estimateCard}>
                <View style={styles.estimateHeader}>
                  <View>
                    <Text style={styles.estimateNumber}>{cq.estimateNumber || `Quote #${idx + 1}`}</Text>
                    <Text style={styles.providerName}>{cq.providerName || 'Provider'}</Text>
                  </View>
                  {savings > 0 && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsBadgeText}>Save {savingsPercent}%</Text>
                    </View>
                  )}
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Estimate</Text>
                  <Text style={[styles.totalValue, savings > 0 && { color: '#10b981' }]}>
                    ${Number(cq.totalAmount || 0).toFixed(2)}
                  </Text>
                </View>

                {savings > 0 && (
                  <Text style={styles.savingsText}>
                    You save ${savings.toFixed(2)} compared to original
                  </Text>
                )}

                {cq.laborCost != null && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Labor</Text>
                    <Text style={styles.breakdownValue}>${Number(cq.laborCost).toFixed(2)}</Text>
                  </View>
                )}
                {cq.partsCost != null && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Parts</Text>
                    <Text style={styles.breakdownValue}>${Number(cq.partsCost).toFixed(2)}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.viewDetailBtn}
                  onPress={() => navigation.navigate('QuoteDetails', { quoteId: cq.id })}
                >
                  <Text style={styles.viewDetailText}>View Full Estimate</Text>
                  <Ionicons name="chevron-forward" size={16} color="#1976d2" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
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
  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 20, gap: 8, borderWidth: 1, borderColor: '#e5e7eb',
  },
  vehicleText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginBottom: 10 },
  estimateCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  originalCard: { borderColor: '#1976d2', borderWidth: 2 },
  estimateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  estimateNumber: { fontSize: 14, fontWeight: '600', color: '#1976d2' },
  providerName: { fontSize: 15, fontWeight: '500', color: '#111827', marginTop: 2 },
  originalBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  originalBadgeText: { fontSize: 11, fontWeight: '700', color: '#1976d2' },
  savingsBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  savingsBadgeText: { fontSize: 11, fontWeight: '700', color: '#10b981' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalLabel: { fontSize: 14, color: '#6b7280' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  savingsText: { fontSize: 12, color: '#10b981', fontWeight: '500', marginBottom: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  breakdownLabel: { fontSize: 13, color: '#6b7280' },
  breakdownValue: { fontSize: 13, fontWeight: '500', color: '#374151' },
  viewDetailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  viewDetailText: { fontSize: 14, fontWeight: '600', color: '#1976d2' },
  emptyCompeting: { alignItems: 'center', padding: 24, backgroundColor: '#fff', borderRadius: 16 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 12 },
});
