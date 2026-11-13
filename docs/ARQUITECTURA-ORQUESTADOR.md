# Arquitectura del Orquestador LLM (Etapa 3)

## Visión general

El núcleo del sistema es un **Orquestador** que:

1. Recibe instrucciones en lenguaje natural del usuario.
2. Interpreta la intención usando un LLM.
3. Decide qué herramientas necesita.
4. Ejecuta las herramientas sobre las Páginas seleccionadas.
5. Informa resultados y estados pendientes.

El LLM **nunca** toca Facebook directamente. Solo decide y coordina. Las herramientas reales son las que ejecutan las acciones.

---

## Principios de diseño

| Principio | Descripción |
|-----------|-------------|
| **Separación total** | El motor de IA está completamente desacoplado de las herramientas de Facebook |
| **Multi-provider** | Se puede cambiar de modelo/proveedor en cualquier momento |
| **Fallback** | Si un proveedor falla, se prueba el siguiente |
| **Tool-calling** | El LLM usa function calling / tools estructurados |
| **Contexto de Páginas** | Siempre se le pasa al LLM qué Páginas están seleccionadas y cuál es la activa |
| **Sin secretos en el cliente** | Tokens y keys solo viven en el servidor |

---

## Estructura de carpetas propuesta

```
src/
├── lib/
│   ├── llm/
│   │   ├── index.ts              # Orquestador principal
│   │   ├── types.ts              # Tipos comunes
│   │   ├── providers/
│   │   │   ├── base.ts           # Interfaz común de providers
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── grok.ts           # xAI
│   │   │   └── index.ts          # Registry + fallback
│   │   └── tools/
│   │       ├── registry.ts       # Registro de herramientas
│   │       ├── list-pages.ts
│   │       ├── get-page-info.ts
│   │       └── ...               # Más herramientas en el futuro
│   └── facebook/                 # (ya existe parcialmente)
```

---

## Flujo de una instrucción

```
Usuario escribe: "Revisá las publicaciones recientes de las Páginas seleccionadas"
        │
        ▼
┌─────────────────────┐
│   Orquestador       │
│  (lib/llm/index.ts) │
└─────────┬───────────┘
          │
          │ 1. Construye el prompt del sistema
          │    + contexto de Páginas seleccionadas
          │    + herramientas disponibles
          │
          ▼
┌─────────────────────┐
│  Provider LLM       │  ← OpenAI / Anthropic / Grok / etc.
│  (con tool calling) │
└─────────┬───────────┘
          │
          │ 2. El modelo responde con tool calls
          │    ej: get_recent_posts({ pageIds: [...] })
          │
          ▼
┌─────────────────────┐
│  Tool Executor      │
│  (registry)         │
└─────────┬───────────┘
          │
          │ 3. Ejecuta la herramienta real
          │    (usa Page Access Tokens del servidor)
          │
          ▼
┌─────────────────────┐
│  Resultado          │
│  → se devuelve al   │
│    LLM si hace falta│
│    más pasos        │
│  → o se muestra al  │
│    usuario          │
└─────────────────────┘
```

---

## Interfaz de un Provider

```ts
interface LLMProvider {
  id: string;
  name: string;
  
  chat(params: {
    messages: Message[];
    tools?: ToolDefinition[];
    temperature?: number;
  }): Promise<LLMResponse>;
}

interface LLMResponse {
  content: string | null;
  toolCalls?: ToolCall[];
  usage?: { inputTokens: number; outputTokens: number };
}
```

Todos los providers implementan la misma interfaz. El orquestador no sabe (ni le importa) qué modelo está usando.

---

## Sistema de Providers + Fallback

```ts
// Ejemplo de configuración
const providers = [
  { id: "grok", model: "grok-2", priority: 1 },
  { id: "openai", model: "gpt-4o", priority: 2 },
  { id: "anthropic", model: "claude-3-5-sonnet", priority: 3 },
];
```

El sistema intenta el de mayor prioridad. Si falla (rate limit, error, etc.), pasa al siguiente.

El usuario podrá elegir manualmente el proveedor/modelo desde la UI.

---

## Contexto que se le pasa al LLM

Siempre se incluye:

- Lista de Páginas seleccionadas (id + nombre)
- Página activa (si hay)
- Herramientas disponibles en ese momento
- Historial reciente de la conversación
- Instrucciones de seguridad (nunca inventar acciones, respetar límites de Meta, etc.)

---

## Herramientas iniciales (futuras)

| Herramienta | Descripción | Etapa |
|-------------|-------------|-------|
| `list_selected_pages` | Devuelve las Páginas actualmente seleccionadas | 3 |
| `get_page_info` | Info básica de una Página | 3 |
| `get_recent_posts` | Publicaciones recientes de una o varias Páginas | 4 |
| `search_posts` | Buscar publicaciones (cuando la API lo permita) | 4+ |
| `prepare_comment` | Generar un comentario (sin publicarlo) | 4+ |
| `post_comment` | Publicar comentario (requiere permisos + App Review) | 5 |

Empezamos con herramientas de **solo lectura** y de **preparación**. Las de escritura se agregan cuando tengamos los permisos y la App Review.

---

## Seguridad y límites

- El LLM **nunca** recibe tokens de acceso.
- Las herramientas validan que la Página esté dentro de las seleccionadas por el usuario.
- Se registran todas las acciones en un historial.
- Rate limiting por usuario.
- El sistema debe ser explícito cuando una acción no es posible por limitaciones de la API de Meta.

---

## Próximos pasos de implementación

1. Crear la interfaz `LLMProvider` y el registry.
2. Implementar al menos 2 providers (ej: Grok + OpenAI).
3. Crear el orquestador básico con tool calling.
4. Hacer una herramienta de prueba (`list_selected_pages`).
5. UI de chat simple para enviar instrucciones.
6. Selector de modelo/proveedor.

---

Documento vivo. Se irá actualizando a medida que avancemos.