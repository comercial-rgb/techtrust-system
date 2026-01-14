# Service Area - Documentação Técnica

## Visão Geral

O **Service Area** (Área de Cobertura) é uma funcionalidade essencial do TechTrust que permite aos provedores de serviços automotivos definirem:
- Onde eles oferecem serviços
- Quais tipos de serviços (oficina, domicílio, assistência rodoviária)
- Raio de atendimento
- Taxas de deslocamento

## Como Funciona o Cálculo de Distância

### 1. Coordenadas GPS

O sistema utiliza **coordenadas GPS (latitude e longitude)** para calcular distâncias:

```typescript
// Base Address (Oficina)
const shopLocation = {
  lat: -23.561684,  // Latitude
  lng: -46.655981   // Longitude
};

// Service Location (Local do Serviço)
const serviceLocation = {
  lat: -23.550520,
  lng: -46.633308
};
```

### 2. Cálculo de Distância em Linha Reta

A distância é calculada usando a **fórmula de Haversine**, que calcula a distância em linha reta entre dois pontos na superfície de uma esfera (Terra):

```typescript
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distância em km
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

**Importante:** A distância calculada é em **linha reta** (distância geodésica), não considerando o percurso real de ruas/rodovias. Na prática, a distância real de deslocamento será maior.

### 3. Tipos de Serviço e Cálculo

#### a) **IN-SHOP (Na Oficina)**
- Cliente vai até a oficina
- **Não há cálculo de distância**
- Sem taxa de deslocamento

#### b) **ON-SITE (Serviço em Domicílio/Local do Cliente)**
- Provedor vai até o cliente (casa, escritório, estacionamento)
- **Distância calculada:** Base Address → Endereço do Cliente
- **Taxa de deslocamento aplicável:**
  ```
  Primeiros X km: GRÁTIS (definido pelo provedor)
  Km adicional: R$ Y por km (definido pelo provedor)
  ```

**Exemplo:**
```
Base Address: Av. Paulista, 1000
Service Location: Rua Augusta, 500
Distance: 3.2 km

Configuração do Provider:
- Free KM: 5 km
- Extra KM Fee: R$ 8.00/km

Cálculo:
3.2 km < 5 km (free) = R$ 0 de taxa de deslocamento
```

**Exemplo 2:**
```
Distance: 12 km

Free KM: 5 km
Extra KM Fee: R$ 8.00/km

Cálculo:
12 km - 5 km (free) = 7 km extra
7 km × R$ 8.00 = R$ 56.00 de taxa de deslocamento
```

#### c) **ROADSIDE ASSISTANCE (Assistência na Rodovia)**
- Emergências em rodovias (pane, pneu furado, bateria, etc.)
- **Distância calculada:** Base Address → Localização GPS do Veículo
- Mesmas regras de taxa de deslocamento do ON-SITE
- **Prioridade:** Geralmente atendimento mais rápido
- **Consideração especial:** Pode incluir pedágios/custos adicionais

## Service Radius (Raio de Atendimento)

O **Service Radius** define o raio máximo (em km) que o provedor está disposto a viajar a partir da sua base:

```
Base Address: Centro da oficina
Service Radius: 15 km

Área de Cobertura: Círculo com raio de 15 km ao redor da oficina
```

### Verificação de Disponibilidade

Quando um cliente solicita um serviço:
1. Sistema calcula distância entre provedor e local do serviço
2. Se `distância <= serviceRadius` → Provedor PODE atender
3. Se `distância > serviceRadius` → Provedor NÃO aparece nos resultados

```typescript
function canProvideService(
  providerLocation: Location,
  serviceLocation: Location,
  serviceRadius: number
): boolean {
  const distance = calculateDistance(
    providerLocation.lat,
    providerLocation.lng,
    serviceLocation.lat,
    serviceLocation.lng
  );
  
  return distance <= serviceRadius;
}
```

## Coverage Zones (Zonas de Cobertura)

### O que são?

**Coverage Zones** são áreas geográficas específicas (bairros, regiões, cidades) onde o provedor oferece seus serviços. Elas funcionam como **tags de localização** para facilitar a busca.

### Por que usar?

1. **Melhor SEO interno:** Clientes buscando por "mecânico em Vila Mariana" encontram provedores que marcaram essa zona
2. **Marketing local:** Destacar áreas específicas de atuação
3. **Gestão de demanda:** Ativar/desativar zonas conforme capacidade

### Como funcionam?

```typescript
interface CoverageZone {
  id: string;
  name: string;        // Ex: "Vila Mariana", "Centro", "Zona Sul"
  region: string;      // Ex: "São Paulo - SP"
  active: boolean;     // Zona ativa ou não
}

// Exemplos
const zones: CoverageZone[] = [
  { id: '1', name: 'Centro', region: 'São Paulo - SP', active: true },
  { id: '2', name: 'Vila Mariana', region: 'São Paulo - SP', active: true },
  { id: '3', name: 'Pinheiros', region: 'São Paulo - SP', active: false },
];
```

**Importante:** Coverage Zones são **complementares** ao Service Radius, não substituem. O sistema verifica:
1. ✅ Distância dentro do raio
2. ✅ (Opcional) Local dentro de uma zona ativa

### Adicionar Coverage Zones

A funcionalidade **"Add"** agora está implementada:

1. Clicar no botão **"Add"** ao lado de "Coverage Zones"
2. Modal abre com campos:
   - **Zone Name** (obrigatório): Nome da zona (ex: "Moema")
   - **Region** (opcional): Região/cidade (ex: "São Paulo - SP")
3. Clicar em **"Add"** para confirmar
4. Nova zona aparece na lista e pode ser ativada/desativada

Você também pode **deletar** zonas clicando no ícone de lixeira 🗑️ ao lado de cada zona.

## Fluxo de Matching (Provider ↔ Customer)

### Quando cliente solicita um serviço:

```typescript
// 1. Cliente cria solicitação
const serviceRequest = {
  serviceType: 'oilChange',
  locationType: 'onSite', // ou 'inShop', 'roadside'
  location: {
    address: 'Rua Augusta, 500',
    lat: -23.550520,
    lng: -46.633308
  }
};

// 2. Sistema busca provedores disponíveis
function findAvailableProviders(request: ServiceRequest): Provider[] {
  return allProviders.filter(provider => {
    // Verifica se provedor oferece esse tipo de serviço
    if (!provider.services.includes(request.serviceType)) {
      return false;
    }
    
    // Verifica se provedor oferece nesse tipo de local
    if (request.locationType === 'onSite' && !provider.mobileService) {
      return false;
    }
    
    if (request.locationType === 'roadside' && !provider.roadsideAssistance) {
      return false;
    }
    
    // Calcula distância
    const distance = calculateDistance(
      provider.baseLocation.lat,
      provider.baseLocation.lng,
      request.location.lat,
      request.location.lng
    );
    
    // Verifica se está dentro do raio
    if (distance > provider.serviceRadiusKm) {
      return false;
    }
    
    // Calcula taxa de deslocamento
    const travelFee = calculateTravelFee(
      distance,
      provider.freeKm,
      provider.extraFeePerKm
    );
    
    // Adiciona informações ao provedor
    provider.matchInfo = {
      distance,
      travelFee,
      estimatedArrivalTime: calculateETA(distance)
    };
    
    return true;
  });
}

// 3. Calcula taxa de deslocamento
function calculateTravelFee(
  distance: number,
  freeKm: number,
  feePerKm: number
): number {
  if (distance <= freeKm) {
    return 0;
  }
  
  const extraKm = distance - freeKm;
  return extraKm * feePerKm;
}
```

## Configuração Recomendada

### Para Oficinas Fixas (Garage):
```typescript
{
  serviceRadius: 10-20,  // Raio médio/pequeno
  mobileService: false,  // Não vai ao cliente
  roadsideAssistance: false,
  coverageZones: ['Bairro principal', 'Bairros vizinhos']
}
```

### Para Mobile Mechanics (Mecânico Móvel):
```typescript
{
  serviceRadius: 25-50,  // Raio maior
  mobileService: true,   // Vai ao cliente
  roadsideAssistance: true,
  freeKm: 5-10,
  extraFeePerKm: 5-10,   // R$ por km
  coverageZones: ['Várias zonas da cidade']
}
```

### Para Roadside Assistance (Guincho/Emergência):
```typescript
{
  serviceRadius: 50-100, // Raio muito grande
  mobileService: true,
  roadsideAssistance: true,
  freeKm: 0,             // Sem km grátis ou pouco
  extraFeePerKm: 8-15,   // Taxa maior
  coverageZones: ['Rodovias', 'Cidades próximas']
}
```

## Melhorias Futuras (Backlog)

1. **Integração com Google Maps API:**
   - Calcular distância real (ruas/tráfego)
   - Estimar tempo de chegada preciso
   - Visualizar mapa interativo

2. **Zonas Geográficas Precisas:**
   - Desenhar polígonos no mapa
   - Importar dados de bairros oficiais
   - Validação automática de endereços

3. **Dynamic Pricing:**
   - Ajustar taxas por horário/dia
   - Taxas especiais para feriados
   - Desconto para clientes recorrentes

4. **Histórico de Atendimentos:**
   - Mapa de calor de áreas mais atendidas
   - Analytics de deslocamento
   - Otimização de rotas

## Resumo

- ✅ **Distância:** Calculada em linha reta (Haversine) usando GPS
- ✅ **Service Types:** In-shop, On-site, Roadside
- ✅ **Taxa de Deslocamento:** (distância - freeKm) × feePerKm
- ✅ **Service Radius:** Raio máximo de atendimento
- ✅ **Coverage Zones:** Tags de áreas/bairros para melhor busca
- ✅ **Add Zones:** Funcionalidade implementada com modal

---

**Última atualização:** Janeiro 2026
