# Sistema de Upload de Imagens - Implementado ✅

## 📝 O que foi feito:

### 1. Backend (techtrust-backend)
- ✅ Criado endpoint `/api/v1/upload` (POST e DELETE)
- ✅ Configurado multer para upload de imagens
- ✅ Validação de tipo de arquivo (apenas imagens)
- ✅ Limite de tamanho: 5MB por arquivo
- ✅ Arquivos salvos em `/uploads` com nome único
- ✅ Servindo arquivos estáticos via `/uploads`

### 2. Frontend Admin (techtrust-admin-dashboard)
- ✅ Componente `ImageUpload.tsx` criado
- ✅ Suporte a drag-and-drop
- ✅ Preview de imagem antes de salvar
- ✅ Upload automático ao selecionar arquivo
- ✅ Botão para remover imagem
- ✅ Integrado em:
  - Formulário de Banners
  - Formulário de Ofertas Especiais
  - Formulário de Artigos

## 🎯 Como usar:

### No Painel Admin:
1. Acesse "Conteúdo" no menu
2. Escolha a aba (Banners, Ofertas ou Artigos)
3. Clique em "Novo" ou edite um item existente
4. No campo de imagem:
   - **Clique** na área para selecionar arquivo, OU
   - **Arraste e solte** a imagem na área
5. A imagem será uploadada automaticamente
6. Preview aparece imediatamente
7. Preencha os outros campos e salve

### Tipos de arquivo aceitos:
- JPEG / JPG
- PNG
- GIF
- WebP

### Tamanho máximo:
- 5MB por arquivo

### Resolução recomendada:
- Banners: 1200x630px (landscape)
- Ofertas: 800x800px (quadrado)
- Artigos: 1200x630px (landscape)

## 🔧 Como testar:

1. **Iniciar backend:**
```bash
cd techtrust-backend
npm run dev
```

2. **Iniciar admin dashboard:**
```bash
cd techtrust-admin-dashboard
npm run dev
```

3. **Fazer login no admin:**
- URL: http://localhost:3001
- Email: admin@techtrust.com
- Senha: Admin123!

4. **Testar upload:**
- Ir em Conteúdo > Banners
- Criar novo banner
- Arrastar uma imagem para a área de upload
- Verificar preview
- Salvar e conferir se a imagem aparece na lista

## 📂 Estrutura de arquivos:

```
techtrust-backend/
├── src/
│   └── routes/
│       └── upload.routes.ts  ← Novo endpoint
├── uploads/                   ← Pasta criada automaticamente
│   └── [imagens aqui]

techtrust-admin-dashboard/
└── src/
    └── components/
        └── ImageUpload.tsx    ← Novo componente
```

## 🌐 URLs das imagens:

Após upload, as imagens ficam acessíveis em:
- **Local:** `http://localhost:3000/uploads/nome-do-arquivo.jpg`
- **Produção:** `https://seu-backend.onrender.com/uploads/nome-do-arquivo.jpg`

## ⚠️ Importante para produção:

Para deploy em produção (Render), considere usar um serviço de armazenamento como:
- **Cloudinary** (gratuito até 25GB)
- **AWS S3**
- **DigitalOcean Spaces**

Motivo: O Render não mantém arquivos permanentemente no sistema de arquivos.

## 🔒 Segurança:

- ✅ Endpoint protegido com autenticação JWT
- ✅ Validação de tipo de arquivo
- ✅ Limite de tamanho configurado
- ✅ Nomes de arquivo únicos (evita sobrescrever)

## 🚀 Próximos passos (opcional):

1. Integrar com Cloudinary para produção
2. Adicionar compressão automática de imagens
3. Gerar múltiplos tamanhos (thumbnails)
4. Adicionar watermark opcional
