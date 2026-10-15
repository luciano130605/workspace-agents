---
name: native-app-web
description: Diseña y construye una app web (React/Tailwind, PWA) que en el celular se sienta y se comporte como una app nativa de iOS/Android — no solo pantallas lindas, sino la app completa - app shell, barra de pestañas inferior, navegación con transiciones, bottom sheets, gestos, feedback táctil, carruseles con snap, estados de carga, modo offline e instalación como PWA. Usar siempre que el usuario pida "que parezca una app", "app nativa", "mobile-first", "PWA", "bottom nav/tab bar", "bottom sheet", "que se sienta como una app del celular", o cuando rediseñe o cree pantallas mobile, aunque no use la palabra "nativa". También al convertir un sitio responsive existente en algo con sensación de app.
---

# App Nativa Web — apps web que se sienten nativas (mobile-first)

Objetivo: que alguien abra la app en su celular y no note que es web. Eso depende de cuatro capas, en este orden de importancia:

1. **Shell y navegación**: la app tiene estructura fija (barra superior, pestañas inferiores, pantallas que se apilan), no es una página que scrollea.
2. **Interacción**: toque inmediato, gestos, feedback, sin rastros de "navegador" (zoom accidental, selección de texto, rebote, resaltado azul).
3. **Presentación**: jerarquía, radios, vidrio, movimiento, áreas seguras, modo oscuro.
4. **Comportamiento de app**: carga instantánea, skeletons, offline, instalación, estado que se conserva.

Rediseñar la presentación y la estructura, nunca la lógica: conservar props, handlers, rutas y comportamiento existentes.

## Flujo de trabajo

1. **Entender el alcance.** ¿Es una pantalla suelta, un flujo o la app completa? ¿Hay router (React Router, Next, etc.)? ¿Tiene que instalarse como PWA? Si no está claro, asumir app completa con PWA y decirlo en una línea.
2. **Leer lo existente.** Componentes, rutas, estilos, `index.html`/layout. Conservar la lógica. Si hay componentes hijos que no se pudieron ver (cards, diálogos), decirlo y pedirlos: ahí suele estar el problema de alturas o estilos.
3. **Diseñar mobile primero (≈390×844)** y después definir qué cambia en `sm`/`lg`. Desktop no se rompe: la barra inferior pasa a sidebar o barra superior, los sheets a modales, los carruseles a grillas.
4. **Construir en este orden**: shell + navegación → pantallas → interacción y movimiento → estados (carga/vacío/error/offline) → PWA.
5. **Revisar la checklist final** y reportar qué quedó fuera (ver "Límites de la web").

## 1. App shell y navegación

- **Altura de la app**: el contenedor raíz usa `h-dvh` (o `min-h-svh`), nunca `vh`. El shell es un grid/flex vertical: `header` (fijo) + `main` (`flex-1 overflow-y-auto`) + `nav` inferior (fijo). Scrollea `main`, no el `body`.
- **Evitar el rebote y el pull-to-refresh del navegador** en el shell: `html, body { overscroll-behavior: none; }` y `overscroll-behavior-y: contain` en el `main` y en cualquier panel que scrollee. Si se quiere pull-to-refresh, implementarlo propio (ver sección 5).
- **Barra de pestañas inferior** (navegación principal en mobile):
  - 3 a 5 destinos, ícono + etiqueta siempre visibles, destino activo con color/relleno distinto y `aria-current="page"`.
  - Alto 56–64px más `pb-[env(safe-area-inset-bottom)]`; fondo con vidrio (`bg-white/80 backdrop-blur-xl`) y borde superior de 0.5px.
  - Tocar la pestaña activa vuelve al inicio de esa pestaña (scroll arriba o pop al root). Cada pestaña conserva su propia posición de scroll y su pila de navegación.
  - Insignias (badges) pequeñas para pendientes. Solo en mobile (`lg:hidden`); en desktop, sidebar o barra superior.
- **Barra superior**: título grande que se colapsa a título chico al scrollear (iOS) o barra compacta (Android). Botón atrás a la izquierda en pantallas secundarias, con zona táctil de 44px. Acciones a la derecha, máximo 2.
- **Navegación por pila**: pantallas de detalle entran deslizando desde la derecha y salen al revés (200–300ms); cambiar de pestaña es un fundido corto, sin deslizamiento. Usar la View Transitions API (`document.startViewTransition`) cuando exista, con fundido simple como alternativa; nunca bloquear la navegación esperando la animación.
- **El botón/gesto atrás del sistema debe funcionar**: cada sheet, detalle o vista inmersiva abierta empuja una entrada al historial (`history.pushState`) y se cierra con `popstate`. Un sheet que no se cierra con "atrás" delata que es web.
- **Deep links**: cada pantalla tiene URL propia y se puede abrir directo; al recargar se vuelve al mismo lugar.
- **Conservar estado**: borradores de formularios, filtros y scroll sobreviven a navegar y volver (estado en memoria/URL/`sessionStorage`).

## 2. Toque, no mouse

- Zonas táctiles de 44px mínimo (preferible 48px): `min-h-11` / `min-h-12`, con 8px de separación entre objetivos. Si el ícono es chico, agrandar el área con padding, no el dibujo.
- Feedback inmediato al presionar: `active:scale-95` (botones chicos) o `active:scale-[0.98]` (anchos) con `transition-transform duration-150`; en filas de lista, `active:bg-black/5`. Nada importante depende de `hover:`; envolver hovers en `@media (hover: hover)`.
- En todo elemento tocable: `touch-manipulation select-none [-webkit-tap-highlight-color:transparent]`. **No** aplicar `select-none` global: el contenido (textos, direcciones, códigos de reserva) debe poder copiarse.
- Acciones principales a ancho completo, ancladas abajo cuando es un flujo, con radios grandes (`rounded-2xl`, `rounded-full`).
- Inputs con `text-base` (16px) o más para que iOS no haga zoom al enfocar. Nunca bloquear el zoom del usuario (`user-scalable=no` está prohibido).
- Teclado correcto por campo: `inputMode`, `type`, `autoComplete`, `enterKeyHint` (`next`, `done`, `search`).
- **Teclado en pantalla**: el campo enfocado y el botón de enviar no quedan tapados. Usar `interactive-widget=resizes-content` en el meta viewport, y como respaldo escuchar `window.visualViewport` para ajustar el padding inferior. Los formularios hacen `scrollIntoView({block: 'center'})` al enfocar.
- **Háptica como mejora progresiva**: `navigator.vibrate?.(10)` en acciones confirmatorias (completar, borrar, cambiar un switch). Es un extra: no existe en iOS Safari y nada puede depender de él. Respetar `prefers-reduced-motion`.
- **Gestos con alternativa visible**: deslizar para cerrar sheets, deslizar una fila para acciones, pull-to-refresh. Todo gesto tiene también un botón. Los gestos usan Pointer Events con `touch-action` explícito (`pan-y`, `none` en el handle).
- No usar gestos que choquen con el sistema: el deslizamiento desde el borde izquierdo/derecho es del navegador/sistema operativo en iOS y Android.

## 3. Estructura visual

- **Hero inmersivo**: imagen a sangre como fondo de la card, degradé oscuro para legibilidad (`bg-gradient-to-t from-black/80 via-black/35 to-black/10`) y texto blanco anclado abajo (`flex flex-col justify-end min-h-[400px]`). En desktop (`sm+`) volver a texto a la izquierda e imagen en columna.
- **Vidrio** sobre imágenes y barras: `bg-white/15 backdrop-blur-md` para chips, burbujas y barras de estado. En desktop volver a superficies sólidas (`sm:bg-paper sm:backdrop-blur-none`). Evitar apilar muchos elementos con `backdrop-blur`: es caro en celulares modestos.
- Radios grandes (24–32px) y sombras suaves; evitar bordes duros en mobile. Separadores de 0.5px (`border-[0.5px]`) en lugar de líneas gruesas.
- Tipografía: sistema por defecto (`font-sans` con `-apple-system, system-ui, Roboto`) salvo que haya marca. Títulos grandes (30–34px, `font-semibold tracking-tight leading-[1.1]`), etiquetas chicas (11–13px), números con `tabular-nums`. Soportar texto agrandado del usuario: usar `rem`, no fijar alturas en `px` en contenedores de texto.
- Encabezados de sección simples ("Ahora en tu viaje") sobre los carruseles, como en las apps del sistema. Listas agrupadas en cards redondeadas con separadores internos (estilo ajustes de iOS).
- **Acciones rápidas**: grilla de 3–4 botones con ícono o ilustración arriba y etiqueta corta abajo, solo en mobile (`sm:hidden`). En desktop van como botones del hero.
- **Bottom sheet** en lugar de modales centrados para paneles de detalle, filtros y confirmaciones:
  - Handle arriba (36×5px), fondo oscurecido (`bg-black/40`), `rounded-t-[26px]`, máximo `max-h-[90dvh]`.
  - Entra deslizando desde abajo; se cierra tocando el fondo, arrastrando hacia abajo, con el botón cerrar o con "atrás".
  - Accesible: `role="dialog"`, `aria-modal="true"`, foco atrapado y devuelto al cerrar, `Escape` cierra, el `body` no scrollea detrás (`overscroll-behavior: contain` en el contenido).
  - Mapas o vistas inmersivas en pantalla completa, con botón de cerrar flotante.
- **Áreas seguras**: `pb-[max(1rem,env(safe-area-inset-bottom))]`, `pt-[env(safe-area-inset-top)]` y laterales para landscape. Todo elemento fijo arriba o abajo suma su inset.
- **Modo oscuro**: colores como variables CSS en `:root` redefinidas bajo `prefers-color-scheme: dark` (o clase `dark`). Fondos de elevación distintos (no solo invertir), imágenes con leve atenuación. `color-scheme: light dark` para controles nativos.

## 4. Carruseles

- `snap-x snap-mandatory overflow-x-auto overscroll-x-contain` + scrollbar oculta (`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`).
- Cada card al ~88% del ancho para que se asome la siguiente; `snap-start` y `scroll-px` igual al padding.
- **No estirar las cards a la misma altura** (`items-start`, sin `h-full` en el contenido). Una card corta no debe quedar con espacio vacío por culpa de la más alta.
- Dots chicos (el activo se alarga), con área táctil de 24px, visibles solo donde hay carrusel. El número de dots debe coincidir con el número real de cards.
- En desktop pasar a grilla con el número real de columnas (3 cards → `lg:grid-cols-3`).
- Listas largas (cientos de filas): virtualizar o usar `content-visibility: auto` para mantener el scroll fluido.

## 5. Estados de app: carga, vacío, error, offline

- **Skeletons, no spinners**, con la forma real del contenido. Spinner solo para acciones puntuales (dentro del botón). Mostrar contenido en caché al instante y refrescar atrás (*stale-while-revalidate*).
- **UI optimista**: al marcar, guardar o borrar, actualizar la pantalla ya y revertir con aviso si falla. Evitar bloquear con pantallas de espera.
- **Pull-to-refresh propio** (si corresponde): solo cuando el `main` está en `scrollTop === 0`, con resistencia, indicador que rota y umbral ≈ 64px; con alternativa (botón o actualización automática).
- **Estados vacíos** con ilustración y una frase útil con acción ("Todavía no hay reservas. Explorar planes"), no espacio en blanco.
- **Errores** con mensaje humano, causa probable y botón "Reintentar"; nunca un código técnico solo. Avisos efímeros (toast/snackbar) arriba de la barra inferior, no tapándola.
- **Offline**: detectar con `navigator.onLine` + eventos `online`/`offline` y mostrar una barra discreta ("Sin conexión – mostrando lo último guardado"). Las acciones que necesitan red se deshabilitan con explicación o se encolan.

## 6. Movimiento

- Duraciones de 150–300ms; easing `cubic-bezier(.22,1,.36,1)` para entradas, `ease-in` corto para salidas.
- Entradas con fade + `translateY(6–8px)`; sheets deslizan desde abajo; detalles desde la derecha; barras de progreso con `transition-[width]`.
- Animar solo `transform` y `opacity` (no `width`/`height`/`top` en elementos grandes) para mantener 60fps. `will-change` solo durante la animación.
- Indicadores "en vivo" con `motion-safe:animate-pulse` o `animate-ping`.
- Siempre respetar `prefers-reduced-motion` (`motion-safe:` / `motion-reduce:` o media query): sin deslizamientos ni escalas, solo fundidos cortos.

## 7. Datos que se sienten reales

- Mostrar la hora actual real y mantenerla viva (`setInterval` de 15–30s, `tabular-nums`) en lugar de textos como "12:45 · Ejemplo". Limpiar el intervalo al desmontar y pausarlo con `document.hidden`.
- Tiempos relativos ("En 15 min", "Ahora", "Día 4 de 12") en vez de solo horas fijas; fechas y monedas con `Intl.DateTimeFormat` / `Intl.NumberFormat` según el idioma del usuario.
- Plurales correctos ("1 reserva", "5 planes"), con `Intl.PluralRules` si hay varios idiomas.
- Si un dato es de demostración, marcarlo con una etiqueta discreta ("Tiempos de ejemplo") para que no parezca real.

## 8. Instalación como PWA

Sin esto la app queda "en una pestaña" y se nota. Para app completa, incluirlo por defecto.

- **`manifest.webmanifest`**: `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, `orientation: "portrait"` (si aplica), `background_color`, `theme_color`, `lang`, e íconos 192 y 512 más uno `purpose: "maskable"`.
- **En el `<head>`**:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0b0b0c" media="(prefers-color-scheme: dark)">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Nombre corto">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  ```
  (con `black-translucent` el contenido pasa debajo de la barra de estado: obliga a respetar `env(safe-area-inset-top)`).
- **Service worker**: precachear el shell (HTML, JS, CSS, fuentes, íconos) con versión; datos con *stale-while-revalidate*; navegación con página offline como respaldo. Si se actualiza, avisar con un toast ("Hay una versión nueva · Actualizar") en vez de recargar sin aviso. Preferir una herramienta probada (Workbox / `vite-plugin-pwa`) antes que escribirlo a mano.
- **Invitación a instalar**: en Chromium, capturar `beforeinstallprompt` y mostrar un botón propio en un momento oportuno (no al primer segundo). En iOS Safari no existe ese evento: mostrar una guía breve ("Compartir → Agregar a pantalla de inicio") solo si no está ya instalada (`matchMedia('(display-mode: standalone)')` o `navigator.standalone`).
- **Splash y modo standalone**: ocultar elementos que sobran al estar instalada (banners de "abrí en la app"), y no dejar enlaces externos que saquen al usuario del contexto sin aviso.

## 9. Accesibilidad

- `focus-visible` visible en todo lo interactivo; roles correctos (`radiogroup`/`radio`, `tablist`/`tab`, `progressbar`, `aria-expanded`/`aria-controls` en desplegables, `aria-current` en la navegación, `aria-live="polite"` en toasts).
- Contraste suficiente del texto sobre imágenes (degradé o vidrio detrás) y en ambos temas (4.5:1).
- Íconos decorativos con `aria-hidden="true"`; imágenes decorativas con `alt=""`; botones solo-ícono con `aria-label`.
- Orden de foco lógico; al navegar a una pantalla nueva, mover el foco a su título.
- Nunca transmitir estado solo con color.

## 10. Rendimiento percibido

- Cargar primero lo visible: `loading="lazy"` y `decoding="async"` en imágenes bajo el pliegue; `width`/`height` o `aspect-ratio` para evitar saltos de layout; hero con `fetchpriority="high"`.
- Dividir código por ruta (`lazy`/`Suspense`) con skeleton de la ruta, y precargar la pestaña vecina al tocar o en reposo.
- Respuesta al toque en menos de 100ms: trabajo pesado fuera del hilo principal o diferido (`startTransition`, `requestIdleCallback`).
- Imágenes modernas (WebP/AVIF) y `srcset`; fuentes con `font-display: swap` o directamente fuentes del sistema.

## Límites de la web (decirlo con honestidad)

Aun bien hecha, una app web instalada **no puede** igualar del todo a una nativa en: háptica fina en iOS, gestos de borde del sistema, notificaciones push completas en todos los dispositivos (en iOS solo con la PWA instalada), acceso profundo a sensores/Bluetooth/contactos, y ejecución en segundo plano. Al entregar, listar en una línea qué quedó como aproximación y, si el proyecto lo necesita, mencionar que un empaquetado con Capacitor es el siguiente paso sin reescribir.

## Checklist final

**Estructura**
- [ ] El shell usa `dvh`, scrollea el `main` y no el `body`; sin rebote ni pull-to-refresh del navegador.
- [ ] Barra de pestañas inferior en mobile (3–5 destinos, activo marcado, scroll/pila por pestaña); sidebar o barra superior en desktop.
- [ ] El botón/gesto atrás cierra sheets y vuelve por la pila; cada pantalla tiene URL.
- [ ] Áreas seguras (arriba, abajo y laterales) y `svh`/`dvh` considerados.

**Interacción**
- [ ] Todo lo tocable mide 44px o más y tiene feedback al presionar.
- [ ] Sin dependencias de hover, sin highlight azul al tocar, sin zoom por inputs (16px+); el texto de contenido sigue siendo seleccionable.
- [ ] El teclado no tapa campos ni botones de envío.
- [ ] Todo gesto tiene alternativa visible; la háptica es opcional.

**Presentación**
- [ ] El hero es inmersivo en mobile y se parte en columnas en desktop.
- [ ] Carrusel con snap, siguiente card asomando, sin cards estiradas ni vacío; dots y grillas coinciden con la cantidad real de cards.
- [ ] Modo claro y oscuro con contraste correcto.
- [ ] Animaciones cortas, solo `transform`/`opacity`, con alternativa de movimiento reducido.

**Comportamiento**
- [ ] Skeletons, estados vacíos, errores con reintento y aviso offline.
- [ ] UI optimista en acciones frecuentes; estado conservado al navegar.
- [ ] Datos de demo etiquetados; hora y tiempos relativos reales.
- [ ] PWA: manifest, íconos (con maskable), meta de iOS, service worker y flujo de instalación por plataforma.

**Calidad**
- [ ] Accesibilidad: foco visible, roles, `aria-label`, contraste.
- [ ] Props, handlers, rutas y comportamiento originales intactos.
- [ ] Informadas las limitaciones que quedaron como aproximación.