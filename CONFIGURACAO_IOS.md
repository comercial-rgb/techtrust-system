# 📱 Configuração iOS - App Store

## Pré-requisitos necessários:

### 1. **Apple Developer Account**
- Conta ativa do Apple Developer Program ($99/ano)
- Acesso ao [Apple Developer Console](https://developer.apple.com/)

### 2. **App Store Connect**
- Acesso ao [App Store Connect](https://appstoreconnect.apple.com/)
- App criado no App Store Connect

---

## 📋 Passo a Passo para Configurar

### **Etapa 1: Obter credenciais necessárias**

#### 1.1 - Apple ID
- Email da conta Apple Developer
- Exemplo: `seu-email@empresa.com`

#### 1.2 - App Store Connect App ID (ascAppId)
- Acessar: https://appstoreconnect.apple.com/apps
- Clicar no app "TechTrust Mobile"
- Copiar o número do App ID (exemplo: `1234567890`)
- Encontrado na URL ou nas informações do app

#### 1.3 - Apple Team ID (appleTeamId)
- Acessar: https://developer.apple.com/account
- Menu: **Membership**
- Copiar **Team ID** (exemplo: `ABCD123456`)

---

### **Etapa 2: Criar App no App Store Connect**

Se ainda não criou o app:

1. Acessar: https://appstoreconnect.apple.com/apps
2. Clicar em **"+"** → **New App**
3. Preencher:
   - **Name**: TechTrust Mobile
   - **Primary Language**: English
   - **Bundle ID**: `com.techtrustautosolutions.mobile` (mesmo do app.json)
   - **SKU**: `techtrust-mobile-001`
   - **User Access**: Full Access

---

### **Etapa 3: Atualizar eas.json**

Editar arquivo: `techtrust-mobile/eas.json`

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "SEU_EMAIL_APPLE@exemplo.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      }
    }
  }
}
```

**Substituir**:
- `SEU_EMAIL_APPLE@exemplo.com` → Email da Apple Developer Account
- `1234567890` → App ID do App Store Connect
- `ABCD123456` → Team ID da Apple Developer

---

### **Etapa 4: Configurar App Store Connect API Key (Opcional, mas recomendado)**

Para automação completa:

1. Acessar: https://appstoreconnect.apple.com/access/api
2. Clicar em **"+"** → **Generate API Key**
3. Preencher:
   - **Name**: EAS Build
   - **Access**: Developer ou App Manager
4. Baixar o arquivo `.p8` (guarde em local seguro!)
5. Anotar:
   - **Issuer ID** (exemplo: `12345678-1234-1234-1234-123456789012`)
   - **Key ID** (exemplo: `ABC123DEF4`)

Adicionar ao `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "SEU_EMAIL_APPLE@exemplo.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456",
        "appleApiKeyPath": "./AuthKey_ABC123DEF4.p8",
        "appleApiKeyIssuerId": "12345678-1234-1234-1234-123456789012",
        "appleApiKeyId": "ABC123DEF4"
      }
    }
  }
}
```

---

### **Etapa 5: Configurar Bundle Identifier no App**

Verificar em `techtrust-mobile/app.json`:

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.techtrustautosolutions.mobile"
    }
  }
}
```

---

## 🚀 Comandos para Build e Submit iOS

### **Build iOS**
```bash
cd techtrust-mobile
eas build --platform ios --profile production
```

### **Submit para TestFlight (Teste Interno)**
```bash
eas submit --platform ios --latest
```

### **Submit para App Store Review**
Após TestFlight, ir manualmente ao App Store Connect e submeter para revisão.

---

## 📝 Checklist de Informações Necessárias

Antes de fazer o primeiro build iOS, você precisa:

- [ ] Apple Developer Account ativa ($99/ano)
- [ ] Email da conta Apple Developer
- [ ] App criado no App Store Connect
- [ ] App Store Connect App ID (ascAppId)
- [ ] Apple Team ID (appleTeamId)
- [ ] Bundle Identifier configurado
- [ ] Screenshots para App Store (obrigatório)
- [ ] Ícone do app (1024x1024px)
- [ ] Descrição do app (EN/PT/ES)
- [ ] Política de Privacidade (URL pública)
- [ ] Termos de Uso (URL pública)

---

## 🔐 Certificados e Provisioning Profiles

O EAS Build gerencia automaticamente:
- ✅ Certificados de distribuição
- ✅ Provisioning profiles
- ✅ Push notification certificates

**Não precisa criar manualmente!**

---

## ⚠️ Problemas Comuns

### "Invalid Bundle Identifier"
- Verificar se o Bundle ID no `app.json` corresponde ao criado no App Store Connect

### "Team ID not found"
- Confirmar Team ID em: https://developer.apple.com/account → Membership

### "App ID not found"
- Criar app no App Store Connect primeiro
- Aguardar alguns minutos após criação

---

## 📞 Próximos Passos

1. **Obter credenciais** listadas acima
2. **Atualizar eas.json** com credenciais corretas
3. **Executar build iOS**: `eas build --platform ios --profile production`
4. **Aguardar build** (~15-20 minutos)
5. **Submit para TestFlight**: `eas submit --platform ios --latest`
6. **Testar no TestFlight** com usuários internos
7. **Submeter para Review** quando aprovado

---

## 📖 Documentação Útil

- [EAS Build - iOS](https://docs.expo.dev/build/setup/)
- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [Submitting to Apple](https://docs.expo.dev/submit/ios/)
- [TestFlight Beta Testing](https://developer.apple.com/testflight/)

---

**Status Atual**:
- ✅ Android: Configurado e funcionando
- ⏳ iOS: Aguardando credenciais Apple

**Versão Atual**: 1.0.5 (versionCode: 6)
