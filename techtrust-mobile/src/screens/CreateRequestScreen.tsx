/**
 * Tela de Criar Solicitação de Serviço
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Text,
  useTheme,
  Switch,
  Menu,
  Divider,
} from 'react-native-paper';
import api from '../services/api';
import { Vehicle } from '../types';

// ✨ Importando componentes de UI
import {
  FadeInView,
  SlideInView,
  ScalePress,
  ShakeView,
  Toast,
  useToast,
  LoadingOverlay,
  SuccessAnimation,
  EnhancedButton,
  EmptyState,
  ListItemSkeleton,
} from '../components';

const SERVICE_TYPES = [
  { value: 'SCHEDULED_MAINTENANCE', label: '🔧 Manutenção', color: '#2196f3' },
  { value: 'REPAIR', label: '🛠️ Reparo', color: '#ff9800' },
  { value: 'ROADSIDE_SOS', label: '🆘 Socorro', color: '#f44336' },
  { value: 'INSPECTION', label: '🔍 Inspeção', color: '#9c27b0' },
  { value: 'DETAILING', label: '✨ Estética', color: '#4caf50' },
];

const LOCATION_TYPES = [
  { value: 'SHOP', label: '🏪 Oficina', description: 'Leve até o prestador' },
  { value: 'MOBILE', label: '🚐 Móvel', description: 'Prestador vai até você' },
  { value: 'CUSTOMER_LOCATION', label: '📍 Meu Local', description: 'No seu endereço' },
];

export default function CreateRequestScreen({ navigation }: any) {
  const theme = useTheme();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [serviceType, setServiceType] = useState('SCHEDULED_MAINTENANCE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationType, setLocationType] = useState('SHOP');
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  // ✨ Toast hook
  const { toast, error, hideToast } = useToast();

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      const response = await api.get('/vehicles');
      const vehicleList = response.data.data || [];
      setVehicles(vehicleList);
      
      const primary = vehicleList.find((v: Vehicle) => v.isPrimary);
      setSelectedVehicle(primary || vehicleList[0] || null);
    } catch (err) {
      console.error('Erro ao carregar veículos:', err);
      error('Erro ao carregar veículos');
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function handleSubmit() {
    if (!selectedVehicle) {
      setHasError(true);
      error('Selecione um veículo');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (title.length < 10 || title.length > 100) {
      setHasError(true);
      error('Título deve ter entre 10 e 100 caracteres');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (description.length < 20 || description.length > 1000) {
      setHasError(true);
      error('Descrição deve ter entre 20 e 1000 caracteres');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/service-requests', {
        vehicleId: selectedVehicle.id,
        serviceType,
        title,
        description,
        serviceLocationType: locationType,
        isUrgent,
      });

      setCreatedRequestId(response.data.data.id);
      setShowSuccess(true);
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao criar solicitação');
    } finally {
      setLoading(false);
    }
  }

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    if (createdRequestId) {
      navigation.navigate('RequestDetails', { requestId: createdRequestId });
    }
  };

  // ✨ Loading vehicles
  if (loadingVehicles) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ListItemSkeleton />
          <View style={{ height: 16 }} />
          <ListItemSkeleton />
          <View style={{ height: 16 }} />
          <ListItemSkeleton />
        </View>
      </View>
    );
  }

  // ✨ Empty state - sem veículos
  if (vehicles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="car-off"
          title="Nenhum Veículo Cadastrado"
          description="Você precisa cadastrar um veículo antes de criar uma solicitação."
          actionLabel="Adicionar Veículo"
          onAction={() => navigation.navigate('AddVehicle')}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✨ Header animado */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>📋</Text>
            <Text variant="titleLarge" style={[styles.title, { color: theme.colors.primary }]}>
              Nova Solicitação
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Descreva o serviço que você precisa
            </Text>
          </View>
        </FadeInView>

        <ShakeView shake={hasError}>
          <View style={styles.form}>
            {/* Seleção de Veículo */}
            <SlideInView direction="left" delay={100}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🚗 Veículo *</Text>
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={
                    <ScalePress onPress={() => setMenuVisible(true)}>
                      <View style={styles.vehicleSelector}>
                        <View style={styles.vehicleIconBox}>
                          <Text style={styles.vehicleIcon}>🚙</Text>
                        </View>
                        <View style={styles.vehicleInfo}>
                          <Text style={styles.vehicleName}>
                            {selectedVehicle
                              ? `${selectedVehicle.make} ${selectedVehicle.model}`
                              : 'Selecione um veículo'}
                          </Text>
                          {selectedVehicle && (
                            <Text style={styles.vehiclePlate}>{selectedVehicle.plateNumber}</Text>
                          )}
                        </View>
                        <Text style={styles.chevron}>▼</Text>
                      </View>
                    </ScalePress>
                  }
                >
                  {vehicles.map((vehicle) => (
                    <Menu.Item
                      key={vehicle.id}
                      onPress={() => {
                        setSelectedVehicle(vehicle);
                        setMenuVisible(false);
                      }}
                      title={`${vehicle.make} ${vehicle.model}`}
                      leadingIcon={vehicle.isPrimary ? 'star' : 'car'}
                    />
                  ))}
                </Menu>
              </View>
            </SlideInView>

            {/* Tipo de Serviço */}
            <SlideInView direction="right" delay={150}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔧 Tipo de Serviço *</Text>
                <View style={styles.serviceTypesGrid}>
                  {SERVICE_TYPES.map((type) => (
                    <ScalePress key={type.value} onPress={() => setServiceType(type.value)}>
                      <View 
                        style={[
                          styles.serviceTypeCard,
                          serviceType === type.value && { 
                            borderColor: type.color,
                            backgroundColor: `${type.color}10`,
                          },
                        ]}
                      >
                        <Text style={styles.serviceTypeLabel}>{type.label}</Text>
                        {serviceType === type.value && (
                          <View style={[styles.checkmark, { backgroundColor: type.color }]}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </View>
                    </ScalePress>
                  ))}
                </View>
              </View>
            </SlideInView>

            {/* Título */}
            <SlideInView direction="left" delay={200}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📝 Título *</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  mode="outlined"
                  placeholder="Ex: Troca de óleo e filtros"
                  maxLength={100}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && title.length < 10}
                />
                <Text style={[styles.charCount, title.length < 10 && { color: '#ef4444' }]}>
                  {title.length}/100 (mínimo 10)
                </Text>
              </View>
            </SlideInView>

            {/* Descrição */}
            <SlideInView direction="right" delay={250}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💬 Descrição *</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  placeholder="Descreva detalhadamente o serviço que você precisa..."
                  multiline
                  numberOfLines={5}
                  maxLength={1000}
                  style={[styles.input, styles.textArea]}
                  outlineStyle={styles.inputOutline}
                  error={hasError && description.length < 20}
                />
                <Text style={[styles.charCount, description.length < 20 && { color: '#ef4444' }]}>
                  {description.length}/1000 (mínimo 20)
                </Text>
              </View>
            </SlideInView>

            {/* Tipo de Local */}
            <SlideInView direction="left" delay={300}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📍 Local do Serviço *</Text>
                <View style={styles.locationTypes}>
                  {LOCATION_TYPES.map((type) => (
                    <ScalePress key={type.value} onPress={() => setLocationType(type.value)}>
                      <View 
                        style={[
                          styles.locationCard,
                          locationType === type.value && { 
                            borderColor: theme.colors.primary,
                            backgroundColor: '#e3f2fd',
                          },
                        ]}
                      >
                        <Text style={styles.locationLabel}>{type.label}</Text>
                        <Text style={styles.locationDescription}>{type.description}</Text>
                      </View>
                    </ScalePress>
                  ))}
                </View>
              </View>
            </SlideInView>

            {/* Urgente */}
            <SlideInView direction="right" delay={350}>
              <ScalePress onPress={() => setIsUrgent(!isUrgent)}>
                <View style={[styles.urgentContainer, isUrgent && styles.urgentActive]}>
                  <View style={styles.urgentInfo}>
                    <Text style={styles.urgentEmoji}>🚨</Text>
                    <View>
                      <Text style={styles.urgentTitle}>Serviço Urgente</Text>
                      <Text style={styles.urgentDescription}>Prioriza sua solicitação</Text>
                    </View>
                  </View>
                  <Switch 
                    value={isUrgent} 
                    onValueChange={setIsUrgent}
                    color={theme.colors.primary}
                  />
                </View>
              </ScalePress>
            </SlideInView>

            <Divider style={styles.divider} />

            {/* Botões */}
            <FadeInView delay={400}>
              <View style={styles.buttonsContainer}>
                <EnhancedButton
                  title="Enviar Solicitação"
                  onPress={handleSubmit}
                  variant="primary"
                  size="large"
                  icon="send"
                  fullWidth
                  loading={loading}
                />

                <EnhancedButton
                  title="Cancelar"
                  onPress={() => navigation.goBack()}
                  variant="ghost"
                  size="medium"
                  fullWidth
                  style={{ marginTop: 8 }}
                />
              </View>
            </FadeInView>
          </View>
        </ShakeView>
      </ScrollView>

      {/* ✨ Loading Overlay */}
      <LoadingOverlay visible={loading} message="Criando solicitação..." />

      {/* ✨ Success Animation */}
      <SuccessAnimation
        visible={showSuccess}
        message="Solicitação criada!"
        onComplete={handleSuccessComplete}
      />

      {/* ✨ Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.6,
  },
  form: {
    width: '100%',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  vehicleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  vehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehicleIcon: {
    fontSize: 22,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  vehiclePlate: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  chevron: {
    fontSize: 12,
    color: '#9ca3af',
  },
  serviceTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceTypeCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    position: 'relative',
  },
  serviceTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  checkmark: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#fff',
  },
  inputOutline: {
    borderRadius: 12,
  },
  textArea: {
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  locationTypes: {
    gap: 10,
  },
  locationCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  locationDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  urgentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  urgentActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#f87171',
  },
  urgentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  urgentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  urgentDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    marginVertical: 24,
  },
  buttonsContainer: {
    marginTop: 8,
  },
});
