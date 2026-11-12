# catalog_pdf_pwa

Aplicación Web Progresiva (PWA) de código abierto diseñada para la creación, maquetación y exportación de catálogos de productos a formato PDF estándar A4. Desarrollada para funcionar al 100% en el navegador (lado cliente), sin servidores intermedios, bases de datos remotas ni costos de mantenimiento.

El proyecto está pensado para que personas no técnicas puedan gestionar inventarios artesanales, fotos y precios directamente desde la pantalla de su teléfono móvil con una experiencia fluida y sin complicaciones.

---

## Índice de Contenidos

1. [Filosofía del Proyecto](#filosofía-del-proyecto)
2. [Características y Funcionalidades](#características-y-funcionalidades)
3. [Estructura del Repositorio](#estructura-del-repositorio)
4. [Esquema de Base de Datos (IndexedDB)](#esquema-de-base-de-datos-indexeddb)
5. [Reglas de Negocio y Automatizaciones](#reglas-de-negocio-y-automatizaciones)
6. [Flujo de Trabajo Multi-dispositivo (PC a Celular)](#flujo-de-trabajo-multi-dispositivo-pc-a-celular)
7. [Reconocimientos](#reconocimientos)
8. [Convenciones de Desarrollo](#convenciones-de-desarrollo)

---

## Filosofía del Proyecto

- **Privacidad y Soberanía Total:** Toda la información (textos, precios, fotografías y configuraciones) reside exclusivamente en el dispositivo del usuario (`IndexedDB`).
- **Cero Dependencia de la Nube:** No requiere cuentas, suscripciones, conexiones a servicios de almacenamiento externo ni hojas de cálculo que puedan romper enlaces o requerir soporte técnico constante.
- **Diseño Centrado en Accesibilidad:** Botones amplios, controles de alto contraste, asistencia ortográfica del sistema operativo y opciones táctiles duales para usuarios de cualquier nivel técnico.
- **Rendimiento Móvil:** Compresión estricta antes del almacenamiento para evitar saturar la memoria RAM del teléfono al renderizar documentos de impresión.

---

## Características y Funcionalidades

### 1. Gestión de Productos (CRUD y Clonado)
- **Creación y Edición Rápida:** Formulario emergente con campos para nombre, formato/contenido (`gr`, `ml`, `unidades`), precio, disponibilidad, descripción e ingredientes o especificaciones técnicas.
- **Duplicar en 1 Toque:** Capacidad de clonar cualquier producto existente para facilitar la creación de variantes (mismo artículo con distinto tamaño, color o especificación) sin reescribir toda la ficha.
- **Gestor de Stock Directo:** Interruptor rápido para marcar ítems como *"Agotado"*, aplicando automáticamente opacidad atenuada y distintivo rojo sin eliminar el producto.

### 2. Procesamiento de Imágenes en Cliente
- **Carga Nativa desde Galería:** Selector de archivo (`<input type="file" accept="image/*">`) que activa directamente la cámara o la galería del dispositivo.
- **Normalización y Recorte 1:1:** Procesamiento automático mediante el API Canvas a proporción cuadrada uniforme para todas las tarjetas.
- **Compresión Balanceada:** Redimensión a un máximo de 1000 × 1000 px en formato JPEG con calidad balanceada (~82%). Reduce imágenes pesadas tomadas con el teléfono a un promedio liviano (~120–250 KB), garantizando nitidez al hacer zoom en el PDF sin generar cierres de la aplicación por sobreconsumo de memoria.

### 3. Máscara de Precios en Tiempo Real
- **Formateo Dinámico al Escribir:** El usuario solo digita números simples; el sistema limpia caracteres no numéricos e inserta sobre la marcha los puntos de miles y el símbolo de divisa (ejemplo: escribir `4` → `$4`; escribir `4500` → `$4.500`).
- **Almacenamiento Puro:** La base de datos almacena el valor numérico entero (`4500`) facilitando consistencia y ordenamientos.

### 4. Modos de Visualización de Ingredientes y Detalles
- **Modo Línea Continua:** Muestra los componentes o detalles como texto corrido separado por comas estándar.
- **Modo Lista Desplegable:** Presenta los detalles dentro de un bloque colapsable interactivo (`<details>`) en la vista web para ahorrar espacio vertical, con una regla en `print.css` que los expande automáticamente de forma visible al imprimir el PDF.

### 5. Distribución de Columnas Dinámica
- Selector de grilla para la página A4:
  * **2 Columnas:** Ideal para afiches promocionales o fichas con descripciones extensas.
  * **3 Columnas:** Estándar balanceado recomendado para catálogos comerciales.
  * **4 Columnas:** Distribución compacta para listas de precios o catálogos mayoristas.
- Controlado globalmente a través de la variable CSS `--grid-columns`.

### 6. Reordenamiento Dual (Táctil y Botones)
- **Drag & Drop Táctil:** Arrastre intuitivo de tarjetas mediante eventos Pointer para pantallas táctiles y ratón.
- **Botones Accesibles (`▲ Subir` / `▼ Bajar`):** Controles directos en cada tarjeta para reordenar la lista paso a paso sin depender de la destreza motriz al arrastrar.

### 7. Motor de Personalización y Temas
- **Paletas Predeterminadas en 1 Clic:**
  * *Botánica / Artesanal:* Tonos oliva orgánicos, verdes hoja y base clara.
  * *Minimalista / Lujo:* Negros profundos, acentos dorados y blancos puros.
  * *Pastel / Infantil:* Rosas empolvados, lavandas y matices suaves.
  * *Neutro:* Azules marinos y escalas de grises modernas.
- **Selector Libre:** Personalización mediante selectores de color para fondo general, fondo de tarjeta, tipografías y color de acento.
- **Cabecera y Banners:** Título principal, subtítulo y banner superior para avisos (ej. *"Todos los pedidos incluyen empaque especial"*).
- **Imagen de Respaldo Personalizable:** Opción en el panel de configuración para subir un logo o imagen propia que sustituya al ícono genérico (`default.svg`) en los productos que no dispongan de fotografía.

### 8. Sistema de Respaldo e Intercambio Portable
- **Copia de Seguridad en JSON Único:** Exporta todo el catálogo en un archivo `.json` que contiene los textos, configuraciones y las fotografías codificadas en cadenas Base64.
- **Carga Multi-dispositivo:** Permite armar el catálogo inicial en un computador y compartir el archivo por mensajería para que la persona lo restaure en su celular con un clic.

---

## Estructura del Repositorio

El proyecto no utiliza compiladores, Node.js ni empaquetadores externos; está construido con estándares web nativos (ES6 Modules, CSS Variables) para facilitar su mantenimiento y ejecución directa:

```text
catalog_pdf_pwa/
├── index.html                  # Estructura SPA (Catálogo, panel de control y modales)
├── manifest.json               # Manifiesto de instalación PWA para Android e iOS
├── sw.js                       # Service Worker para ejecución completa offline
├── README.md                   # Documentación y especificación del sistema
│
├── css/
│   ├── base.css                # Tipografías, resets y variables CSS (--bg, --accent, etc.)
│   ├── catalog.css             # Grilla responsiva, tarjetas, badges y listas colapsables
│   ├── admin.css               # Barra superior, modales, selectores de color e inputs
│   └── print.css               # Reglas de impresión A4, saltos de página y ocultamiento de UI
│
├── js/
│   ├── db.js                   # Conexión asíncrona con IndexedDB (CRUD y configuración)
│   ├── image-helper.js         # Procesamiento en Canvas (recorte 1:1, compresión JPEG)
│   ├── rules.js                # Máscara de precio en vivo, formateo y normalización de texto
│   ├── drag-drop.js            # Motor de arrastre táctil y actualización de orden
│   ├── theme.js                # Inyección de variables CSS (paletas y color pickers)
│   ├── backup.js               # Exportación e importación de archivos de respaldo JSON
│   └── app.js                  # Inicialización, orquestación de eventos y renderizado
│
└── assets/
    ├── icons/
    │   ├── B_app_icon.jpg      # Icono en alta resolución PWA
    │   └── S_app_icon.jpg      # Icono estándar PWA
    └── default.svg             # Gráfico vectorial neutro y ultra ligero (~1.5 KB)
```

---

## Esquema de Base de Datos (IndexedDB)

Base de datos: `CatalogPdfDB` (Versión 1).

### Almacén `config`
Almacena las preferencias visuales, maquetación y encabezados.
- **Clave primaria (keyPath):** `id` (Valor fijo: `"app_settings"`)

```json
{
  "id": "app_settings",
  "catalog_title": "Catálogo de Productos",
  "catalog_subtitle": "Colección Artesanal",
  "columns": 3,
  "ingredients_mode": "inline",
  "theme_preset": "botanico",
  "custom_placeholder": null,
  "colors": {
    "bg": "#f4f5f7",
    "card_bg": "#ffffff",
    "text": "#2d3748",
    "accent": "#44683c"
  },
  "banner": {
    "active": false,
    "badge": "Aviso Especial",
    "title": "¡Listos para regalar!",
    "text": "Todos nuestros artículos incluyen empaque individual artesanal."
  }
}
```

### Almacén `products`
Almacena cada uno de los artículos del catálogo.
- **Clave primaria (keyPath):** `id` (String alfanumérico generado por timestamp o UUID)
- **Índices:** `order` (para mantener la secuencia manual)

```json
{
  "id": "prod_1731289200000",
  "order": 0,
  "name": "Producto Artesanal Ejemplo",
  "format": "70 gr",
  "price": 4500,
  "in_stock": true,
  "description": "Descripción concisa de las características y beneficios del producto.",
  "ingredients": "Materiales, componentes o especificaciones técnicas.",
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

---

## Reglas de Negocio y Automatizaciones

1. **Normalización de Texto al Guardar:**
   * La primera letra de los nombres y títulos se convierte a mayúscula automáticamente.
   * Se eliminan espacios en blanco dobles y saltos de línea accidentales.
   * Las listas de componentes separadas por saltos de línea o guiones se convierten a un listado estandarizado separado por comas y espacios limpios.
2. **Evaluación de Precios:**
   * Si el campo queda en blanco o el valor es 0, el catálogo muestra *"Sin precio"* con tipografía suave.
   * Valores mayores a 0 siempre se muestran con formato monetario con separador de miles (ej. `$4.500` o `$12.000`).
3. **Comportamiento ante Impresión (`print.css`):**
   * Se ocultan la barra de herramientas, botones de subida/bajada, eliminadores y modales.
   * Se aplica `page-break-inside: avoid` y `break-inside: avoid` en cada tarjeta para evitar cortes a mitad de un producto entre páginas A4.
   * Se fuerza el despliegue de las listas colapsables (`details`) para garantizar la visibilidad total de los componentes en el PDF.

---

## Flujo de Trabajo Multi-dispositivo (PC a Celular)

Para simplificar la adopción a usuarios no técnicos:

1. **Configuración Inicial en Computador:**
   * Abre la PWA en el navegador de la PC.
   * Carga los productos con fotos desde el disco duro, define títulos, banner y colores.
   * Presiona **"Exportar Copia de Seguridad"** para descargar el archivo `respaldo_catalogo.json`.
2. **Transferencia:**
   * Envía el archivo `respaldo_catalogo.json` a la persona usuaria por mensajería.
3. **Carga en el Celular:**
   * Abre la PWA instalada en su teléfono móvil.
   * Presiona **"Importar Respaldo"** y selecciona el archivo recibido.
   * El catálogo completo queda clonado en el almacenamiento local de su dispositivo, listo para ser modificado o exportado a PDF cuando lo necesite.

---

## Reconocimientos

- Diseñado y desarrollado con la asistencia técnica de **Gemini** (Google AI) para la definición de la arquitectura de software, algoritmos de procesamiento Canvas y estandarización PWA.

---

## Convenciones de Desarrollo

Para facilitar el mantenimiento técnico y garantizar una experiencia natural a los usuarios finales:
* **Código base en inglés:** La arquitectura interna, funciones, variables, nombres de archivos, claves del esquema IndexedDB y comentarios técnicos se redactan en inglés (`saveProduct`, `formatPrice`, `order`).
* **Interfaz de usuario en español:** Todas las etiquetas visibles, botones, alertas, modales y textos predeterminados de maquetación están localizados íntegramente en español.
