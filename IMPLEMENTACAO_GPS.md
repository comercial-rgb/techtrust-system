# 🚀 Sistema de Cálculo de Distância - Implementado

## ✅ O que foi Implementado

### 1. **Migração do Banco de Dados**
✅ Schema Prisma atualizado com novos campos:

**ProviderProfile:**
- `baseLatitude` (Decimal 10,8) - Coordenadas GPS da oficina
- `baseLongitude` (Decimal 11,8)
- `mobileService` (Boolean) - Atendimento no local do cliente
- `roadsideAssistance` (Boolean) - Assistência em rodovia (SOS)
- `freeKm` (Int) - Km grátis inclusos
- `extraFeePerKm` (Decimal) - Taxa por km adicional

**ServiceRequest:**
- `serviceLatitude` (Decimal 10,8) - Coordenadas do local de serviço
- `serviceLongitude` (Decimal 11,8)
- `locationType` (String) - IN_SHOP, ON_SITE, ROADSIDE

**Quote:**
- `distanceKm` (Decimal 7,2) - Distância calculada
- `travelFee` (Decimal 10,2) - Taxa de deslocamento

**CoverageZone (nova tabela):**
- `providerId` - Relacionamento com provider
- `name` - Nome da zona (ex: "Zona Sul")
- `region` - Região (ex: "São Paulo")
- `active` - Status ativo/inativo
- `polygonCoordinates` - JSON com coordenadas do polígono (opcional)

✅ **Migração aplicada:** `20260111203245_add_gps_coordinates_and_coverage_zones`

---

### 2. **Serviço de Geocoding**
✅ Arquivo: `src/services/geocoding.service.ts`

Funções implementadas:
- `geocodeAddress(address)` - Converte endereço → coordenadas GPS
- `reverseGeocode(lat, lng)` - Converte coordenadas → endereço
- `isValidCoordinates(lat, lng)` - Valida coordenadas
- `formatAddress()` - Formata endereço completo

**Provedor usado:** OpenStreetMap Nominatim (gratuito, sem API key)
- Limite: 1 requisição por segundo
- Não requer configuração adicional

---

### 3. **Utilidades de Distância**
✅ Arquivos criados:
- `techtrust-backend/src/utils/distance.ts` (230 linhas)
- `techtrust-mobile/src/utils/distance.ts` (280 linhas)
- `techtrust-mobile/src/utils/__tests__/distance.test.ts` (300 linhas)

Funções principais:
- `calculateDistance()` - Fórmula de Haversine
- `calculateTravelFee()` - Calcula taxa de deslocamento
- `isWithinServiceRadius()` - Verifica se está no raio
- `findProvidersWithinRadius()` - Filtra e ordena providers
- `formatDistance()`, `formatTravelTime()` - Formatação

---

### 4. **Endpoints da API**

#### **A) Busca de Providers por Raio** 🔍
```
GET /api/v1/providers/search?lat=-23.5505&lng=-46.6333&radius=50
```

**Parâmetros:**
- `lat` (obrigatório) - Latitude do local de serviço
- `lng` (obrigatório) - Longitude do local de serviço
- `radius` (opcional) - Raio em km (padrão: 50)
- `serviceType` (opcional) - Tipo de serviço

**Resposta:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "uuid",
        "businessName": "Auto Center SP",
        "baseLatitude": -23.5613,
        "baseLongitude": -46.6565,
        "distance": {
          "distanceKm": 3.2,
          "distanceMiles": 2.0,
          "withinRadius": true,
          "estimatedTimeMinutes": 6
        },
        "travelFee": 15.00,
        "freeKm": 5,
        "extraFeePerKm": 5.00,
        "averageRating": 4.8,
        "totalReviews": 120
      }
    ],
    "searchLocation": { "latitude": -23.5505, "longitude": -46.6333 },
    "searchRadius": 50,
    "totalFound": 5
  }
}
```

#### **B) Atualizar Perfil do Provider** 📍
```
PATCH /api/v1/providers/profile
```

**Body:**
```json
{
  "businessName": "Auto Center SP",
  "address": "Av. Paulista, 1000",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01310-100",
  "serviceRadiusKm": 50,
  "mobileService": true,
  "roadsideAssistance": false,
  "freeKm": 5,
  "extraFeePerKm": 5.00
}
```

**Comportamento:**
- Faz geocoding automático do endereço
- Salva `baseLatitude` e `baseLongitude` automaticamente
- Se geocoding falhar, continua sem coordenadas (apenas log de aviso)

#### **C) Geocoding Manual** 🗺️
```
POST /api/v1/geocoding/geocode
Body: { "address": "Av. Paulista, 1000, São Paulo, SP" }
```

```
POST /api/v1/geocoding/reverse
Body: { "latitude": -23.5505, "longitude": -46.6333 }
```

---

### 5. **Cálculo Automático de Distância em Quotes**
✅ Controller atualizado: `src/controllers/quote.controller.ts`

**Comportamento:**
1. Quando provider cria um quote, o sistema:
   - Busca coordenadas do provider (`baseLatitude`, `baseLongitude`)
   - Busca coordenadas do local de serviço (`serviceLatitude`, `serviceLongitude`)
   - **Calcula distância automaticamente** usando Haversine
   - **Calcula taxa de deslocamento**: `(distanceKm - freeKm) × extraFeePerKm`
   - **Adiciona `travelFee` ao `totalAmount`** automaticamente

2. Quote é salvo com:
   - `distanceKm` - Distância calculada
   - `travelFee` - Taxa de deslocamento
   - `totalAmount` - Já inclui a taxa

**Logs:**
```
Distância calculada: 3.20 km, Taxa: R$ 0.00 (dentro dos 5 km grátis)
Distância calculada: 12.50 km, Taxa: R$ 37.50 (7.5 km × R$ 5.00/km)
```

---

## 🧪 Como Testar

### 1. **Verificar Migração**
```bash
cd techtrust-backend
npx prisma studio
# Abrir tabela provider_profiles e verificar novos campos
```

### 2. **Atualizar Perfil do Provider com Geocoding**
```bash
curl -X PATCH http://localhost:3010/api/v1/providers/profile \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Av. Paulista, 1578",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-200",
    "mobileService": true,
    "freeKm": 5,
    "extraFeePerKm": 5.00
  }'
```

**Resultado esperado:**
- Perfil atualizado
- `baseLatitude` e `baseLongitude` preenchidos automaticamente
- Console mostra: `Geocoding bem-sucedido: Av. Paulista, 1578, São Paulo, SP -> (-23.5613, -46.6565)`

### 3. **Buscar Providers por Raio**
```bash
# Centro de São Paulo: -23.5505, -46.6333
curl "http://localhost:3010/api/v1/providers/search?lat=-23.5505&lng=-46.6333&radius=50"
```

**Resultado esperado:**
- Lista de providers ordenados por distância
- Cada provider tem `distance.distanceKm` calculado
- Campo `travelFee` calculado baseado em `freeKm` e `extraFeePerKm`

### 4. **Criar Quote com Cálculo Automático**
```bash
# Primeiro, criar ServiceRequest com coordenadas
curl -X POST http://localhost:3010/api/v1/service-requests \
  -H "Authorization: Bearer TOKEN_CLIENTE" \
  -d '{
    "serviceType": "REPAIR",
    "customerAddress": "Av. Faria Lima, 3000, São Paulo, SP",
    "serviceLatitude": -23.5870,
    "serviceLongitude": -46.6817
  }'

# Depois, provider cria quote (distância é calculada automaticamente)
curl -X POST http://localhost:3010/api/v1/quotes \
  -H "Authorization: Bearer TOKEN_PROVIDER" \
  -d '{
    "serviceRequestId": "ID_DA_REQUEST",
    "partsCost": 100,
    "laborCost": 80
  }'
```

**Resultado esperado:**
- Quote criado com `distanceKm` preenchido (ex: 3.2)
- `travelFee` calculado e adicionado ao `totalAmount`
- Console mostra: `Distância calculada: 3.20 km, Taxa: R$ 0.00`

### 5. **Testar Geocoding Manual**
```bash
# Endereço → Coordenadas
curl -X POST http://localhost:3010/api/v1/geocoding/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "Av. Paulista, 1000, São Paulo, SP"}'

# Coordenadas → Endereço
curl -X POST http://localhost:3010/api/v1/geocoding/reverse \
  -H "Content-Type: application/json" \
  -d '{"latitude": -23.5505, "longitude": -46.6333}'
```

---

## 📊 Fórmula de Cálculo

### Distância (Haversine)
Calcula distância geodésica (linha reta na superfície da Terra):

```typescript
const R = 6371; // Raio da Terra em km
const dLat = toRadians(lat2 - lat1);
const dLon = toRadians(lon2 - lon1);
const a = 
  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
  Math.sin(dLon / 2) * Math.sin(dLon / 2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
const distance = R * c;
```

### Taxa de Deslocamento
```typescript
if (distanceKm <= freeKm) {
  travelFee = 0;
} else {
  travelFee = (distanceKm - freeKm) × extraFeePerKm;
}
```

**Exemplo:**
- Provider: `freeKm = 5`, `extraFeePerKm = R$ 5,00`
- Distância: 12 km
- Cálculo: `(12 - 5) × 5 = R$ 35,00`

---

## 🔄 Próximos Passos Recomendados

### Fase 2 - Frontend Integration
- [ ] Adicionar mapa no app mobile (react-native-maps)
- [ ] Capturar GPS do dispositivo para ServiceRequest
- [ ] Exibir distância e taxa nos cards de quotes
- [ ] Tela de configuração de Service Area no provider dashboard

### Fase 3 - Otimizações
- [ ] Implementar bounding box pre-filter (performance)
- [ ] Cache de geocoding (evitar chamadas repetidas)
- [ ] PostGIS para queries espaciais avançadas
- [ ] Integrar API de rotas para distância real (Google Directions)

---

## 📝 Arquivos Modificados/Criados

### Backend
✅ `prisma/schema.prisma` - Schema atualizado
✅ `prisma/migrations/20260111203245_add_gps_coordinates_and_coverage_zones/` - Migração SQL
✅ `src/services/geocoding.service.ts` - Serviço de geocoding
✅ `src/utils/distance.ts` - Utilidades de distância
✅ `src/controllers/provider.controller.ts` - Atualizado com busca por raio
✅ `src/controllers/quote.controller.ts` - Cálculo automático de distância
✅ `src/controllers/geocoding.controller.ts` - Novo controller
✅ `src/routes/provider.routes.ts` - Novo endpoint /search
✅ `src/routes/geocoding.routes.ts` - Novas rotas
✅ `src/server.ts` - Registro de rotas

### Mobile
✅ `src/utils/distance.ts` - Utilidades de distância
✅ `src/utils/__tests__/distance.test.ts` - Testes completos
✅ `src/screens/provider/ProviderServiceAreaScreen.tsx` - UI melhorada

### Documentação
✅ `MIGRATION_GPS_COORDINATES.md` - Guia de migração
✅ `DOCS_SERVICE_AREA.md` - Documentação técnica
✅ `IMPLEMENTACAO_GPS.md` - Este arquivo

---

## ✨ Resumo do que o Sistema Agora Faz

1. ✅ **Geocoding automático** quando provider atualiza perfil
2. ✅ **Busca de providers** por raio e localização
3. ✅ **Cálculo automático de distância** ao criar quote
4. ✅ **Taxa de deslocamento** calculada e incluída no total
5. ✅ **API completa** para geocoding manual
6. ✅ **Fórmula Haversine** implementada e testada
7. ✅ **Database pronto** com todos os campos GPS
8. ✅ **Gratuito** - usa OpenStreetMap Nominatim

**O sistema agora consegue calcular distâncias internamente! 🎉**
