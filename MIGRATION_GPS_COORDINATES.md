# Migração: Adicionar Suporte para Coordenadas GPS

## Objetivo
Adicionar campos de latitude/longitude para permitir cálculo preciso de distâncias usando a fórmula de Haversine.

## Alterações no Schema Prisma

### 1. Provider Profile - Adicionar Coordenadas da Base

```prisma
model ProviderProfile {
  // ... campos existentes ...
  
  // Endereço
  address String
  city    String
  state   String
  zipCode String
  
  // ✅ NOVOS CAMPOS: Coordenadas GPS da base/oficina
  baseLatitude  Decimal? @db.Decimal(10, 8)  // Ex: -23.56168400
  baseLongitude Decimal? @db.Decimal(11, 8)  // Ex: -46.65598100
  
  // Raio de atendimento (em km)
  serviceRadiusKm Int @default(25)
  
  // ✅ NOVOS CAMPOS: Configuração de deslocamento
  mobileService       Boolean @default(false)  // Oferece serviço móvel
  roadsideAssistance  Boolean @default(false)  // Oferece assistência rodoviária
  freeKm             Int     @default(5)       // Km grátis
  extraFeePerKm      Decimal @default(5.00) @db.Decimal(10, 2)  // Taxa por km extra
  
  // ... outros campos ...
}
```

### 2. Service Request - Adicionar Coordenadas do Local de Serviço

```prisma
model ServiceRequest {
  // ... campos existentes ...
  
  // Localização do serviço
  serviceAddress String?
  serviceCity    String?
  serviceState   String?
  serviceZipCode String?
  
  // ✅ NOVOS CAMPOS: Coordenadas GPS do local do serviço
  serviceLatitude  Decimal? @db.Decimal(10, 8)
  serviceLongitude Decimal? @db.Decimal(11, 8)
  
  locationType String @default("IN_SHOP")  // IN_SHOP, ON_SITE, ROADSIDE
  
  // ... outros campos ...
}
```

### 3. Quote - Adicionar Informações de Distância

```prisma
model Quote {
  // ... campos existentes ...
  
  // Valores
  partsTotal      Decimal @db.Decimal(10, 2)
  laborTotal      Decimal @db.Decimal(10, 2)
  discount        Decimal @default(0) @db.Decimal(10, 2)
  tax             Decimal @default(0) @db.Decimal(10, 2)
  
  // ✅ NOVOS CAMPOS: Informações de deslocamento
  distanceKm      Decimal? @db.Decimal(10, 2)  // Distância calculada
  travelFee       Decimal  @default(0) @db.Decimal(10, 2)  // Taxa de deslocamento
  
  total           Decimal @db.Decimal(10, 2)
  
  // ... outros campos ...
}
```

### 4. Coverage Zone - Nova Tabela (Opcional)

```prisma
model CoverageZone {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  providerId String
  provider   ProviderProfile @relation(fields: [providerId], references: [id], onDelete: Cascade)
  
  name       String   // Ex: "Centro", "Vila Mariana"
  region     String?  // Ex: "São Paulo - SP"
  active     Boolean  @default(true)
  
  // Opcional: Polígono de cobertura (JSON array de coordenadas)
  polygonCoordinates Json?
  
  @@index([providerId])
  @@index([active])
  @@map("coverage_zones")
}
```

## Script de Migração SQL

```sql
-- 1. Adicionar campos GPS ao ProviderProfile
ALTER TABLE provider_profiles
ADD COLUMN base_latitude DECIMAL(10, 8),
ADD COLUMN base_longitude DECIMAL(11, 8),
ADD COLUMN mobile_service BOOLEAN DEFAULT false,
ADD COLUMN roadside_assistance BOOLEAN DEFAULT false,
ADD COLUMN free_km INTEGER DEFAULT 5,
ADD COLUMN extra_fee_per_km DECIMAL(10, 2) DEFAULT 5.00;

-- 2. Adicionar campos GPS ao ServiceRequest
ALTER TABLE service_requests
ADD COLUMN service_latitude DECIMAL(10, 8),
ADD COLUMN service_longitude DECIMAL(11, 8),
ADD COLUMN location_type VARCHAR(20) DEFAULT 'IN_SHOP';

-- 3. Adicionar campos de distância ao Quote
ALTER TABLE quotes
ADD COLUMN distance_km DECIMAL(10, 2),
ADD COLUMN travel_fee DECIMAL(10, 2) DEFAULT 0.00;

-- 4. Criar tabela CoverageZone (Opcional)
CREATE TABLE coverage_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(255),
  active BOOLEAN DEFAULT true,
  polygon_coordinates JSONB,
  
  CONSTRAINT fk_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id)
);

CREATE INDEX idx_coverage_zones_provider ON coverage_zones(provider_id);
CREATE INDEX idx_coverage_zones_active ON coverage_zones(active);

-- 5. Criar índices para melhor performance em queries espaciais
CREATE INDEX idx_provider_profiles_location ON provider_profiles(base_latitude, base_longitude)
WHERE base_latitude IS NOT NULL AND base_longitude IS NOT NULL;

CREATE INDEX idx_service_requests_location ON service_requests(service_latitude, service_longitude)
WHERE service_latitude IS NOT NULL AND service_longitude IS NOT NULL;
```

## Dados de Exemplo

### Providers com Coordenadas GPS (São Paulo)

```typescript
// Provider 1: Oficina na Av. Paulista
{
  businessName: "Auto Center Paulista",
  address: "Av. Paulista, 1000",
  city: "São Paulo",
  state: "SP",
  zipCode: "01310-100",
  baseLatitude: -23.561684,
  baseLongitude: -46.655981,
  serviceRadiusKm: 15,
  mobileService: true,
  roadsideAssistance: false,
  freeKm: 5,
  extraFeePerKm: 8.00
}

// Provider 2: Mecânico Móvel
{
  businessName: "Mobile Mechanics SP",
  address: "Rua Augusta, 500",
  city: "São Paulo",
  state: "SP",
  zipCode: "01305-000",
  baseLatitude: -23.550520,
  baseLongitude: -46.633308,
  serviceRadiusKm: 25,
  mobileService: true,
  roadsideAssistance: true,
  freeKm: 10,
  extraFeePerKm: 6.00
}

// Provider 3: Guincho/Assistência Rodoviária
{
  businessName: "SOS Auto Rápido",
  address: "Marginal Pinheiros, km 10",
  city: "São Paulo",
  state: "SP",
  zipCode: "05508-000",
  baseLatitude: -23.601289,
  baseLongitude: -46.691307,
  serviceRadiusKm: 50,
  mobileService: false,
  roadsideAssistance: true,
  freeKm: 0,
  extraFeePerKm: 12.00
}
```

## Como Obter Coordenadas GPS

### 1. Usando Google Geocoding API

```typescript
import axios from 'axios';

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });
    
    if (response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Uso:
const coords = await geocodeAddress('Av. Paulista, 1000, São Paulo, SP');
// { lat: -23.561684, lng: -46.655981 }
```

### 2. Usando OpenStreetMap (Nominatim) - GRATUITO

```typescript
async function geocodeAddressOSM(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'TechTrust/1.0',
      },
    });
    
    if (response.data && response.data.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
      };
    }
    
    return null;
  } catch (error) {
    console.error('OSM Geocoding error:', error);
    return null;
  }
}
```

### 3. No Mobile App (React Native)

```typescript
import * as Location from 'expo-location';

async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Permission denied');
      return null;
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  } catch (error) {
    console.error('Location error:', error);
    return null;
  }
}
```

## Exemplo de Query com Cálculo de Distância

```typescript
import { PrismaClient } from '@prisma/client';
import { findProvidersWithinRadius, calculateServiceDistance } from '../utils/distance';

const prisma = new PrismaClient();

async function findAvailableProviders(
  serviceLatitude: number,
  serviceLongitude: number,
  serviceType: string,
  locationType: 'IN_SHOP' | 'ON_SITE' | 'ROADSIDE'
) {
  // 1. Buscar providers que oferecem esse tipo de serviço
  const providers = await prisma.providerProfile.findMany({
    where: {
      isVerified: true,
      baseLatitude: { not: null },
      baseLongitude: { not: null },
      // Filtrar por tipo de serviço
      ...(locationType === 'ON_SITE' && { mobileService: true }),
      ...(locationType === 'ROADSIDE' && { roadsideAssistance: true }),
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });
  
  // 2. Calcular distância e filtrar por raio
  const serviceLocation = {
    latitude: serviceLatitude,
    longitude: serviceLongitude,
  };
  
  const availableProviders = findProvidersWithinRadius(
    serviceLocation,
    providers.map(p => ({
      ...p,
      baseLocation: {
        latitude: Number(p.baseLatitude),
        longitude: Number(p.baseLongitude),
      },
      serviceRadiusKm: p.serviceRadiusKm,
      freeKm: p.freeKm,
      feePerKm: Number(p.extraFeePerKm),
    }))
  );
  
  // 3. Formatar resultado
  return availableProviders.map(provider => ({
    id: provider.id,
    businessName: provider.businessName,
    user: provider.user,
    distance: {
      km: provider.distanceInfo.distanceKm,
      miles: provider.distanceInfo.distanceMiles,
      formatted: `${provider.distanceInfo.distanceKm.toFixed(1)} km`,
    },
    travelFee: provider.distanceInfo.travelFee,
    estimatedArrival: `${provider.distanceInfo.estimatedTimeMinutes} min`,
    rating: Number(provider.averageRating),
  }));
}
```

## Performance e Otimizações

### 1. Bounding Box Query (Reduzir Busca Inicial)

Para melhorar performance, primeiro filtrar providers dentro de um "quadrado" antes de calcular distâncias exatas:

```typescript
function getBoundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111; // 1 grau de latitude ≈ 111 km
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

// Usar na query:
const bbox = getBoundingBox(serviceLatitude, serviceLongitude, 50);

const providers = await prisma.providerProfile.findMany({
  where: {
    baseLatitude: { gte: bbox.minLat, lte: bbox.maxLat },
    baseLongitude: { gte: bbox.minLng, lte: bbox.maxLng },
    // ... outros filtros
  },
});
```

### 2. Índices Espaciais (PostGIS)

Para queries muito rápidas, considere usar PostGIS:

```sql
-- Instalar extensão PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Adicionar coluna de geometria
ALTER TABLE provider_profiles
ADD COLUMN base_location GEOMETRY(Point, 4326);

-- Criar índice espacial
CREATE INDEX idx_provider_base_location ON provider_profiles USING GIST(base_location);

-- Query com raio
SELECT * FROM provider_profiles
WHERE ST_DWithin(
  base_location,
  ST_SetSRID(ST_MakePoint(-46.655981, -23.561684), 4326)::geography,
  15000  -- 15 km em metros
);
```

## Checklist de Implementação

- [ ] Atualizar schema Prisma
- [ ] Criar e executar migração SQL
- [ ] Implementar utils/distance.ts no backend
- [ ] Atualizar API endpoints para aceitar coordenadas
- [ ] Implementar geocoding para converter endereços
- [ ] Atualizar frontend mobile para solicitar permissão GPS
- [ ] Testar cálculo de distância com dados reais
- [ ] Implementar filtro de providers por raio
- [ ] Adicionar cálculo de taxa de deslocamento nos quotes
- [ ] Documentar API com novos campos
- [ ] Criar testes automatizados

---

**Nota:** Com essas mudanças, o sistema poderá calcular distâncias internamente de forma precisa e automática!
