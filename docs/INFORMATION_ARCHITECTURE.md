# 📐 Arquitectura de Información — Ursa Platform

> **Documento de Diseño UX/AI**  
> **Versión:** 2.0.0  
> **Fecha:** Enero 2025  
> **Metodología:** Los 5 Planos de Jesse James Garrett + Ergonomía Cognitiva de Don Norman  
> **Autor:** El Arquitecto de los 5 Planos (Consultoría AI/UX)

---

## 📑 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Plano de Estrategia](#plano-de-estrategia)
3. [Plano de Alcance](#plano-de-alcance)
4. [Plano de Estructura](#plano-de-estructura)
5. [Flujos de Usuario](#flujos-de-usuario)
6. [Sistema de Navegación](#sistema-de-navegación)
7. [Auditoría Norman (Ergonomía Cognitiva)](#auditoría-norman-ergonomía-cognitiva)
8. [Sistema de Notificaciones en Tiempo Real](#sistema-de-notificaciones-en-tiempo-real)
9. [Inventario de Contenido](#inventario-de-contenido)
10. [Próximos Pasos](#próximos-pasos)

---

## Resumen Ejecutivo

### ¿Qué es Ursa?

**Ursa** es una plataforma SaaS de nueva generación para la generación masiva de imágenes con IA, nacida en la nube de Google Cloud Platform. A diferencia de herramientas tradicionales, Ursa oculta la complejidad técnica de la IA tras una experiencia de usuario intuitiva basada en **Capacidades Creativas**.

### Filosofía de Diseño

> **"El usuario no interactúa con modelos—interactúa con Capacidades Creativas."**

Esta filosofía guía toda la arquitectura de información. El usuario nunca ve términos técnicos como "imagen-3.0-capability-001" o "referenceType: subject". En su lugar, trabaja con conceptos creativos familiares.

### Organización

**Cognitio Artifacts** — Desarrolladores de la plataforma Ursa.

---

## Plano de Estrategia

> *"La estrategia es la capa invisible que da sentido a todo lo demás."* — Jesse James Garrett

### Objetivos del Negocio

| Objetivo | Descripción | KPI Asociado |
|----------|-------------|--------------|
| **Diferenciación** | Posicionar Ursa como la herramienta premium para generación con consistencia visual | NPS, Feature adoption rate |
| **Retención** | Experiencia tan fluida que los usuarios prefieran Ursa sobre alternativas | Churn rate, DAU/MAU |
| **Monetización** | Sistema de créditos transparente con contabilidad de partida doble | MRR, Credit utilization rate |
| **Escalabilidad** | Arquitectura GCP-nativa que escala automáticamente | Concurrent users, Generation throughput |

### Usuario Principal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PERSONA PRINCIPAL                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  👤 "El Creativo Eficiente"                                                 │
│                                                                              │
│  Rol:        Diseñador gráfico, Director de arte, Marketero                 │
│  Contexto:   Trabaja en agencias o equipos de marketing internos            │
│  Objetivo:   Generar múltiples assets visuales coherentes para campañas     │
│                                                                              │
│  Conocimientos:                                                              │
│  ├── ✅ Entiende conceptos creativos (estilo, composición, marca)           │
│  ├── ✅ Sabe lo que quiere lograr visualmente                               │
│  ├── ⚠️ No quiere entender modelos de IA o parámetros técnicos              │
│  └── ⚠️ Quiere saber cuánto cuesta ANTES de generar                         │
│                                                                              │
│  Frustraciones actuales:                                                     │
│  ├── Generar imágenes una por una es tedioso                                │
│  ├── Mantener consistencia visual entre imágenes es difícil                 │
│  ├── No sabe cuánto costará cada generación                                 │
│  └── Pierde contexto si cierra la pestaña                                   │
│                                                                              │
│  Expectativas:                                                               │
│  ├── UI que habla en términos creativos, no técnicos                        │
│  ├── Ver el costo exacto en créditos ANTES de confirmar                     │
│  ├── Recibir notificación aunque cierre el navegador                        │
│  └── Flujo de 3 clics: Proyecto → Referencias → Generar                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Modelo Mental del Usuario: Capacidades Creativas

El usuario **NO** piensa en modelos de IA. Piensa en **lo que quiere lograr creativamente**:

| El Usuario Piensa | Ursa Provee | NO Mostramos |
|-------------------|-------------|--------------|
| "Quiero este estilo" | Capacidad: **Transferencia de Estilo** | `imagen-3.0-capability-001` |
| "Mantén mi producto igual" | Capacidad: **Preservación de Sujeto** | `referenceType: subject` |
| "Sigue esta composición" | Capacidad: **Control Estructural** | `controlType: canny` |
| "Que se vea como mi marca" | Capacidad: **Consistencia de Marca** | Parámetros de referencia |
| "Genera rápido, no perfecto" | Modo: **Generación Rápida** | `imagen-3.0-fast-generate-001` |

### La "Acción de Oro" (≤3 Clics) — Flujo Asíncrono

> **"Crear Proyecto → Cargar Referencias → Lanzar Batch"**

Este flujo completo debe ser alcanzable en **≤3 clics** desde el Dashboard. El proceso es **100% asíncrono**: el usuario "lanza" el batch y recibe una confirmación inmediata de que el proceso ha comenzado en segundo plano.

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Clic 1     │    │   Clic 2     │    │   Clic 3     │    │  ASYNC       │
│              │    │              │    │              │    │              │
│  + Nuevo     │───▶│  Arrastrar   │───▶│  Confirmar   │───▶│  Cloud Tasks │
│  Proyecto    │    │  Referencias │    │  (ver costo) │    │  procesa     │
│              │    │              │    │              │    │  en segundo  │
└──────────────┘    └──────────────┘    └──────────────┘    │  plano       │
                                                            └──────────────┘
                                                                   │
                                        ┌──────────────────────────┼───────┐
                                        │                          │       │
                                        ▼                          ▼       ▼
                                 ┌─────────────┐           ┌─────────────┐
                                 │  In-App     │           │  Push/      │
                                 │  Progress   │           │  Webhook    │
                                 │  (Firebase) │           │  (si cerró  │
                                 └─────────────┘           │  pestaña)   │
                                                           └─────────────┘
```

**Comportamiento del Clic 3:**
1. Usuario ve el costo total en créditos y confirma
2. Sistema reserva los créditos en el Ledger (transacción RESERVATION)
3. Sistema encola el trabajo en **Cloud Tasks**
4. Usuario recibe **confirmación inmediata**: "Tu batch está en proceso"
5. Usuario puede cerrar la pestaña o continuar trabajando
6. **Firebase Realtime** envía actualizaciones de progreso
7. Al completar, se envía push notification y/o webhook

---

## Plano de Alcance

> *"El alcance define qué construimos y qué dejamos fuera."* — Jesse James Garrett

### Matriz de Capacidades Creativas

Esta matriz es **central** para la UI. El usuario elige capacidades, no modelos:

| Capacidad Creativa | Descripción Usuario | Ícono | Créditos Base |
|--------------------|---------------------|-------|---------------|
| **Transferencia de Estilo** | "Aplica el estilo visual de esta imagen" | 🎨 | +2 |
| **Control Estructural** | "Sigue la composición/estructura de esta imagen" | 📐 | +2 |
| **Preservación de Sujeto** | "Mantén exactamente este producto/persona" | 🎯 | +2 |
| **Consistencia de Personaje** | "Es el mismo personaje en diferentes escenas" | 👤 | +2 |
| **Consistencia de Marca** | "Sigue la identidad visual de mi marca" | 🏷️ | +2 |

### Modos de Generación (Abstracción de Modelos)

| Modo Usuario | Descripción | Soporta Capacidades | Créditos |
|--------------|-------------|---------------------|----------|
| **Precisión** | Máxima calidad, control total | ✅ Todas | 8 base |
| **Estándar** | Alta calidad, texto a imagen | ❌ Ninguna | 6 base |
| **Rápido** | Iteraciones veloces | ❌ Ninguna | 3 base |

### Requerimientos Funcionales (Enfocados en UX)

#### Core (MVP)

| ID | Requerimiento | Métrica UX |
|----|---------------|------------|
| F01 | Crear proyecto en ≤3 clics | Tiempo < 30s |
| F02 | Arrastrar referencias (drag & drop) | Zero friction |
| F03 | Ver costo ANTES de generar | 100% visibilidad |
| F04 | Recibir notificación si cierro pestaña | Firebase push |
| F05 | Historial de transacciones de créditos | Transparencia total |
| F06 | Generar batch de hasta 100 prompts | Bulk efficiency |

#### Ergonomía Cognitiva (Norman)

| ID | Requerimiento | Principio Norman |
|----|---------------|------------------|
| UX01 | Previsualización de costo antes de confirmar | Feedback anticipado |
| UX02 | Progress bar con ETA durante generación | Estado del sistema visible |
| UX03 | Capacidades mostradas como chips visuales | Reconocimiento > Recuerdo |
| UX04 | Warning si capacidades no compatibles con modo | Prevención de errores |
| UX05 | Créditos expirando mostrados prominentemente | Urgencia transparente |

---

## Plano de Estructura

> *"La estructura es el esqueleto que sostiene la experiencia."* — Jesse James Garrett

### Mapa del Sitio

```
Ursa Platform
│
├── 🏠 Dashboard (Home)
│   ├── Balance de Créditos (prominente)
│   │   ├── Disponibles
│   │   ├── Reservados (en proceso)
│   │   └── Por expirar (warning si < 3 días)
│   ├── Proyectos Recientes (cards visuales)
│   ├── CTA Principal: "+ Nuevo Proyecto"
│   ├── Generaciones en Progreso (si las hay)
│   └── Notificaciones Recientes
│
├── 📁 Proyectos
│   ├── Vista Lista/Grid de Proyectos
│   │
│   └── 📂 [Proyecto Individual]
│       │
│       ├── 🎨 Studio (Vista Principal)
│       │   ├── Panel Izquierdo: Referencias + Capacidades
│       │   │   ├── Drag & Drop de imágenes
│       │   │   ├── Selector de Capacidad por imagen
│       │   │   └── Thumbnails con tipo visual
│       │   │
│       │   ├── Panel Central: Prompt + Preview
│       │   │   ├── Campo de prompt (expandible)
│       │   │   ├── Preview de referencias aplicadas
│       │   │   └── Estimación de resultado
│       │   │
│       │   └── Panel Derecho: Costo + Generar
│       │       ├── Desglose de créditos
│       │       │   ├── Base (Modo)
│       │       │   ├── + Capacidades
│       │       │   └── = Total
│       │       ├── Balance actual
│       │       ├── Balance después
│       │       └── Botón "Generar" (o "Créditos insuficientes")
│       │
│       ├── 📋 Prompts (Lista/Batch)
│       │   ├── Lista de prompts del proyecto
│       │   ├── Bulk import (CSV/paste)
│       │   ├── Aplicar capacidad masiva
│       │   └── Generar todo el batch
│       │
│       ├── 📂 Colecciones
│       │   ├── Lista de colecciones del proyecto
│       │   ├── Crear/Editar colecciones
│       │   ├── Mover imágenes entre colecciones
│       │   └── Exportar colección completa (ZIP)
│       │
│       └── 🖼️ Galería
│           ├── Grid de imágenes generadas
│           ├── Filtros por colección, capacidad, fecha
│           ├── Lightbox con metadata
│           ├── Asignar imagen a colección
│           └── Acciones: Descargar, Regenerar
│
├── 💰 Créditos
│   ├── Balance Actual (grande, prominente)
│   ├── Créditos por Expirar (timeline visual)
│   ├── Comprar Más (paquetes)
│   └── Historial de Transacciones (Ledger)
│       ├── Vista de partida doble
│       ├── Filtrar por tipo
│       └── Exportar CSV
│
├── ⚙️ Configuración
│   ├── 👤 Perfil
│   ├── 🔔 Notificaciones
│   │   ├── Push (Firebase)
│   │   └── Webhooks personalizados
│   └── 🔑 API & Integraciones
│
└── ❓ Centro de Ayuda
    ├── Guía: Capacidades Creativas explicadas
    ├── Guía: Sistema de créditos
    ├── Guía: Webhooks y automatización
    └── FAQ
```

### Taxonomía Principal (Lenguaje de Usuario)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TAXONOMÍA                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PROYECTO                                                                    │
│  └── Espacio creativo que agrupa tu trabajo                                 │
│      ├── Tiene: Nombre, Descripción, Estilo Maestro (Master Aesthetic)     │
│      ├── Contiene: Múltiples Colecciones, Prompts y Referencias            │
│      └── Produce: Galería de Imágenes organizadas                           │
│                                                                              │
│  COLECCIÓN (Gestión de Colecciones)                                          │
│  └── Agrupación temática de imágenes generadas dentro de un proyecto       │
│      ├── Ejemplo: "Fotos de Producto", "Hero Images", "Social Media"       │
│      ├── Permite: Filtrar, organizar y exportar por grupo                  │
│      ├── Metadata: Nombre, descripción, fecha de creación                  │
│      └── Nota: NO es una carpeta de archivos—es metadata inteligente        │
│                                                                              │
│  CAPACIDAD CREATIVA                                                          │
│  └── Lo que quieres lograr con una imagen de referencia                     │
│      ├── Transferencia de Estilo 🎨                                         │
│      ├── Control Estructural 📐                                              │
│      ├── Preservación de Sujeto 🎯                                          │
│      ├── Consistencia de Personaje 👤                                       │
│      └── Consistencia de Marca 🏷️                                           │
│                                                                              │
│  MODO DE GENERACIÓN                                                          │
│  └── Equilibrio entre calidad, velocidad y costo                            │
│      ├── Precisión: Máximo control (8 créditos)                             │
│      ├── Estándar: Alta calidad (6 créditos)                                │
│      └── Rápido: Iteraciones (3 créditos)                                   │
│                                                                              │
│  CRÉDITOS                                                                    │
│  └── Tu balance para generar imágenes (contabilidad de partida doble)       │
│      ├── Disponibles: Los puedes usar ahora                                 │
│      ├── Reservados: En uso por generaciones activas (Ledger)               │
│      └── Por expirar: Úsalos antes de que desaparezcan (15 días)            │
│                                                                              │
│  BATCH                                                                       │
│  └── Múltiples generaciones ejecutadas en una sola operación                │
│      ├── Procesado: Asíncrono via Cloud Tasks                               │
│      ├── Notificación: Firebase Realtime + Push                             │
│      └── Límite: Hasta 100 prompts por batch                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Flujos de Usuario

### Flujo 1: Crear Proyecto y Generar (La Acción de Oro)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Dashboard  │───▶│   Crear     │───▶│   Studio    │───▶│  Confirmar  │
│  + Nuevo    │    │  Proyecto   │    │  + Refs     │    │  (ver costo)│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │
      │                  │                  │                  ▼
      │                  │                  │           ┌─────────────┐
      │                  │                  │           │  Firebase   │
      │                  │                  │           │  Push si    │
      │                  │                  │           │  cierro tab │
      │                  │                  │           └─────────────┘
      │                  │                  │
      ▼                  ▼                  ▼
   Clic 1             Clic 2             Clic 3
```

### Flujo 2: Visualización de Costo (Ergonomía Cognitiva)

Este flujo es **crítico** para la confianza del usuario. Antes de cada generación:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PANEL DE COSTO (Siempre Visible)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📊 DESGLOSE DE CRÉDITOS                                            │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  Modo Precisión (base)                              8 créditos      │   │
│  │                                                                      │   │
│  │  + Transferencia de Estilo 🎨                       2 créditos      │   │
│  │  + Preservación de Sujeto 🎯 (2 imágenes)          4 créditos      │   │
│  │                                                     ─────────────   │   │
│  │  TOTAL POR IMAGEN                                  14 créditos      │   │
│  │                                                                      │   │
│  │  × 5 prompts en batch                                               │   │
│  │                                                     ═════════════   │   │
│  │  TOTAL GENERACIÓN                                  70 créditos      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  💰 TU BALANCE                                                       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  Disponible ahora:                                100 créditos      │   │
│  │  Después de esta generación:                       30 créditos      │   │
│  │                                                                      │   │
│  │  ⚠️ 15 créditos expiran en 3 días                                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │      [Cancelar]                        [Generar 5 imágenes ✓]       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flujo 3: Selección de Capacidades (No Modelos)

El usuario **nunca** ve selectores de modelos. Ve capacidades:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SELECTOR DE CAPACIDADES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Tu imagen de referencia: [thumbnail de producto]                           │
│                                                                              │
│  ¿Qué quieres lograr con esta imagen?                                       │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ○ 🎨 Transferencia de Estilo                                          │ │
│  │      "Quiero que mis nuevas imágenes tengan ESTE estilo visual"       │ │
│  │      Ejemplo: Colores, texturas, "vibra" artística                    │ │
│  │                                                              +2 créd. │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ○ 📐 Control Estructural                                               │ │
│  │      "Quiero que sigan ESTA composición o estructura"                  │ │
│  │      Ejemplo: Pose, layout, distribución de elementos                  │ │
│  │                                                              +2 créd. │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ● 🎯 Preservación de Sujeto                              [SELECCIONADO] │
│  │      "Quiero que ESTE producto/objeto aparezca exactamente igual"     │ │
│  │      Ejemplo: Tu producto en diferentes escenas                        │ │
│  │                                                              +2 créd. │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ℹ️ Puedes combinar hasta 4 capacidades con imágenes diferentes             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sistema de Navegación

### Navegación Global (Sidebar)

```
┌─────────────────────────────┐
│  🌟 Ursa                    │
│  Constellation-grade AI     │
├─────────────────────────────┤
│                             │
│  💰 147 créditos            │  ← Balance siempre visible
│      ⚠️ 15 expiran pronto   │
│                             │
├─────────────────────────────┤
│                             │
│  🏠 Dashboard               │
│                             │
│  📁 Proyectos          ▼    │
│     ├── Campaña Navidad     │
│     ├── Producto Nuevo      │
│     └── + Nuevo Proyecto    │
│                             │
├─────────────────────────────┤
│  💰 Créditos                │
│  ⚙️ Configuración           │
│  ❓ Ayuda                   │
├─────────────────────────────┤
│  [Avatar] Santiago     ▼    │
│     └── Cerrar sesión       │
└─────────────────────────────┘
```

### Navegación Contextual (Dentro de Proyecto)

```
┌────────────────────────────────────────────────────────────────┐
│  ← Proyectos / Campaña Navidad 2025                     [⚙️]   │
├────────────────────────────────────────────────────────────────┤
│  [🎨 Studio]   [📋 Prompts (12)]   [🖼️ Galería (48)]          │
└────────────────────────────────────────────────────────────────┘
```

---

## Auditoría Norman (Ergonomía Cognitiva)

> *"El diseño centrado en el usuario no es opcional, es la única opción."* — Don Norman

### Principio Central: Transparencia del Costo

> **El usuario debe ver exactamente cuántos créditos costará el batch ANTES de confirmar la ejecución.**

Esta es la regla más importante de la ergonomía en Ursa. El sistema nunca debe:
- Cobrar más de lo indicado
- Ocultar costos adicionales
- Procesar sin confirmación explícita del costo

### 1. Visibilidad del Estado del Sistema

| Situación | Feedback Requerido |
|-----------|-------------------|
| **Antes de generar** | Desglose exacto: base + capacidades + multiplicador batch = TOTAL |
| Generación en progreso | Progress bar + ETA + porcentaje (vía Firebase Realtime) |
| Créditos reservados | "X créditos en uso" en balance (Ledger RESERVATION) |
| Generación completada | Push notification (incluso con tab cerrada) |
| Créditos por expirar | Warning con countdown (3 días antes) |

### 2. Correspondencia Sistema-Usuario

| Concepto Técnico | Término Usuario | Justificación |
|------------------|-----------------|---------------|
| `imagen-3.0-capability-001` | "Modo Precisión" | Lenguaje de resultado, no de modelo |
| `referenceType: style` | "Transferencia de Estilo 🎨" | Describe la acción, no el parámetro |
| Ledger transaction | "Historial de créditos" | Familiar para cualquier usuario |
| `reservedCredits` | "Créditos en uso" | Explica por qué no están disponibles |

### 3. Prevención de Errores

| Escenario de Error | Prevención |
|--------------------|------------|
| Usuario en modo Rápido con capacidades | Desactivar capacidades + tooltip explicando |
| Créditos insuficientes | Botón deshabilitado + "Necesitas X más" + link a comprar |
| Capacidad incompatible | Mostrar solo capacidades válidas para el modo |
| Generación muy costosa | Confirmación adicional si > 50 créditos |

### 4. Reconocimiento sobre Recuerdo

| Elemento | Implementación |
|----------|----------------|
| Capacidades | Chips visuales con ícono + color + costo |
| Modos | Cards con descripción + caso de uso + costo |
| Referencias | Thumbnails con badge de capacidad aplicada |
| Historial | Timeline visual de transacciones |

### 5. Flexibilidad y Eficiencia

| Usuario Novato | Usuario Experto |
|----------------|-----------------|
| Wizard paso a paso | Atajo: Cmd+N para nuevo proyecto |
| Tooltips explicativos | Shortcuts visibles en menús |
| Confirmaciones explícitas | "No volver a preguntar" para confirmaciones |

---

## Sistema de Notificaciones en Tiempo Real

### Arquitectura de Notificaciones (Firebase)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE NOTIFICACIONES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │  Cloud Run  │────▶│   Firebase  │────▶│   Browser   │                   │
│  │  (Backend)  │     │   Realtime  │     │   (Push)    │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│         │                   │                   │                           │
│         │                   │                   ▼                           │
│         │                   │            ┌─────────────┐                   │
│         │                   │            │   System    │                   │
│         │                   │            │   Notif.    │                   │
│         │                   │            │  (Desktop)  │                   │
│         │                   │            └─────────────┘                   │
│         │                   │                                               │
│         │                   ▼                                               │
│         │            ┌─────────────┐                                        │
│         │            │   In-App    │                                        │
│         │            │   Updates   │                                        │
│         │            │  (Realtime) │                                        │
│         │            └─────────────┘                                        │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                            │
│  │  Webhooks   │                                                            │
│  │  (Custom)   │                                                            │
│  └─────────────┘                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tipos de Notificaciones

| Evento | Canal In-App | Push Desktop | Webhook |
|--------|--------------|--------------|---------|
| Generación iniciada | ✅ Toast | ❌ | ⚙️ Configurable |
| Progreso batch | ✅ Progress bar | ❌ | ❌ |
| Generación completada | ✅ Toast + Gallery update | ✅ | ⚙️ Configurable |
| Generación fallida | ✅ Toast + Error details | ✅ | ⚙️ Configurable |
| Créditos bajos (< 10) | ✅ Warning badge | ❌ | ⚙️ Configurable |
| Créditos por expirar | ✅ Banner | ✅ (3 días antes) | ⚙️ Configurable |
| Batch completado | ✅ Toast | ✅ | ⚙️ Configurable |

### Webhooks Personalizados

Los usuarios pueden configurar webhooks para integrar Ursa con sus herramientas:

```json
// Ejemplo de payload de webhook
{
  "event": "generation.completed",
  "timestamp": "2025-01-15T14:30:00Z",
  "data": {
    "jobId": "job_abc123",
    "projectId": "proj_xyz789",
    "prompt": "Product on marble surface...",
    "outputs": [
      {
        "id": "out_001",
        "url": "https://cdn.ursa.ai/outputs/...",
        "width": 1024,
        "height": 1024
      }
    ],
    "creditsUsed": 14,
    "generationTimeMs": 12500
  }
}
```

---

## Inventario de Contenido

### Dashboard

| Bloque | Contenido | Prioridad Visual |
|--------|-----------|------------------|
| Balance de Créditos | Disponibles, Reservados, Por expirar | **Crítica** |
| CTA Principal | "+ Nuevo Proyecto" | **Crítica** |
| Generaciones Activas | Progress bars con ETA | Alta (si hay) |
| Proyectos Recientes | Cards con thumbnail, nombre, stats | Alta |
| Notificaciones | Últimas 5, link a todas | Media |

### Panel de Costo (Studio)

| Campo | Formato | Siempre Visible |
|-------|---------|-----------------|
| Modo seleccionado | "Precisión (8 créd.)" | ✅ |
| Capacidades activas | Chips con costo individual | ✅ |
| Total por imagen | "14 créditos" | ✅ |
| Multiplicador batch | "× 5 prompts" | ✅ si batch |
| Total generación | "70 créditos" (grande) | ✅ |
| Balance actual | "100 disponibles" | ✅ |
| Balance después | "30 restantes" | ✅ |
| Warning expiración | "15 expiran en 3 días" | ✅ si aplica |

### Historial de Transacciones (Ledger)

| Columna | Descripción |
|---------|-------------|
| Fecha/Hora | Timestamp de la transacción |
| Tipo | COMPRA, GENERACIÓN, RESERVA, EXPIRACIÓN, etc. |
| Descripción | "Generación: Campaña Navidad - 5 imágenes" |
| Débito | Créditos que salen |
| Crédito | Créditos que entran |
| Balance | Balance después de la transacción |

---

## Próximos Pasos

### Plano de Esqueleto

| Entregable | Descripción |
|------------|-------------|
| Wireframes de Studio | Vista de 3 paneles con selector de capacidades |
| Wireframes de Costo | Panel de desglose de créditos |
| Wireframes de Ledger | Vista de transacciones estilo partida doble |
| Prototipo navegable | Figma interactivo |

### Plano de Superficie (Ursa Brand)

| Entregable | Descripción |
|------------|-------------|
| Design System Ursa | Colores (constelación), tipografía, espaciado |
| Iconografía de Capacidades | Set de íconos para cada capacidad creativa |
| Componentes shadcn/ui | Adaptados a la marca Ursa |
| Dark Mode (primario) | Tema oscuro como default |

---

## Apéndice A: Glosario (Términos de Usuario)

| Término | Definición para el Usuario |
|---------|---------------------------|
| **Capacidad Creativa** | Lo que quieres lograr con una imagen de referencia |
| **Modo de Generación** | Equilibrio entre calidad, velocidad y costo |
| **Créditos** | Tu balance para generar imágenes |
| **Batch** | Generar múltiples imágenes de una vez |
| **Estilo Maestro** | El "look" general que se aplica a todo tu proyecto |
| **Referencia** | Una imagen que usas para guiar la generación |

---

> *"Este documento es un mapa, no el territorio. Iterar es inevitable y bienvenido."*
> — El Arquitecto de los 5 Planos

---

**Documento generado para:** Cognitio Artifacts  
**Proyecto:** Ursa Platform  
**Versión:** 2.0.0  
**Fecha:** Enero 2025

