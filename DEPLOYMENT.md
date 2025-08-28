# Guía de Deployment - Sistema de Riego IrrigIA

## Configuración GitLab + Vercel

### 1. Configurar Variables de Entorno en GitLab

Ve a tu proyecto GitLab → Settings → CI/CD → Variables y agrega:

\`\`\`
VERCEL_TOKEN = tu_token_de_vercel
\`\`\`

### 2. Configurar Variables en Vercel

En tu dashboard de Vercel, agrega estas variables de entorno:

\`\`\`
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = tu_api_key_aqui
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = tu_map_id_personalizado
NEXT_PUBLIC_GOOGLE_MAPS_REGION = CO
NEXT_PUBLIC_GOOGLE_MAPS_LANGUAGE = es
\`\`\`

### 3. Obtener Token de Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/account/tokens)
2. Crea un nuevo token
3. Cópialo y agrégalo como variable `VERCEL_TOKEN` en GitLab

### 4. Comandos para Configurar

\`\`\`bash
# Instalar Vercel CLI
npm i -g vercel

# Conectar proyecto con GitLab
vercel --git-provider gitlab

# Configurar proyecto
vercel

# Deploy manual (opcional)
vercel --prod
\`\`\`

### 5. Flujo de Trabajo

- **Push a `main`** → Deploy automático a producción
- **Push a `develop`** → Deploy automático a staging
- **Pull Requests** → Preview deployments automáticos

### 6. Monitoreo

- Logs de build: GitLab CI/CD → Pipelines
- Logs de deployment: Vercel Dashboard → Deployments
- Métricas: Vercel Dashboard → Analytics

## Troubleshooting

### Error de dependencias
\`\`\`bash
pnpm install --no-frozen-lockfile
\`\`\`

### Error de Google Maps
Verificar que las APIs estén habilitadas en Google Cloud Console:
- Maps JavaScript API
- Places API
- Geocoding API

**Importante**: Nunca incluyas API keys reales en archivos de documentación o código fuente. Siempre usa placeholders como "tu_api_key_aqui" en la documentación.
