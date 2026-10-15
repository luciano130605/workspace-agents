---
name: web-perfo
description: Diagnostica el rendimiento de cualquier componente, pantalla o flujo de la app (React/Tailwind, también Vue o HTML) y responde tres cosas - QUÉ componente va lento, POR QUÉ (causa raíz medida, no supuesta) y CÓMO arreglarlo (soluciones ordenadas por impacto, con código). Usar siempre que el usuario diga que algo "va lento", "se traba", "laggea", "tarda en cargar", "se siente pesado", "el scroll no es fluido", "el carrusel/lista/mapa/sheet va mal", "se renderiza de más", o pida optimizar un componente, mejorar velocidad, Lighthouse, Core Web Vitals (LCP, INP, CLS) o el peso del bundle, aunque no diga la palabra "performance". Sirve para cualquier proyecto y está pensada para apps mobile-first que deben sentirse nativas.
---

# Performance de componentes: qué va lento, por qué y cómo arreglarlo

Regla madre: **medir antes de opinar**. Nunca recomendar `useMemo`, `React.memo` o "lazy loading" por intuición. Cada afirmación lleva evidencia (un tiempo de render, un conteo de renders, un archivo del bundle, una cascada de red). Lo que no se pudo medir se marca como *hipótesis*.

La unidad de análisis es el **componente** (y el flujo donde vive). El entregable es un **informe** con los componentes ordenados de más a menos costosos, y para cada uno: *qué le pasa, por qué, solución y cómo verificarla*.

## Flujo de trabajo

1. **Acotar el síntoma.** ¿Qué componente o interacción se siente mal? ¿Al cargar, al tocar, al scrollear, al escribir, al abrir un sheet, con el tiempo? Si el usuario no lo dice, deducirlo del código; si hace falta, preguntar una sola cosa.
2. **Mapear la app.** Leer el árbol de componentes, rutas, estado global/contextos, llamadas de datos y `package.json`. Identificar qué componentes son "calientes": los que se montan en cada pantalla, los que se repiten (cards, filas) y los que tienen timers, animaciones o datos en vivo.
3. **Instrumentar y medir** (sección 1). Medir en build de producción y en condiciones de celular de gama media.
4. **Auditar cada componente sospechoso** con la ficha de la sección 2.
5. **Confirmar la causa raíz** con una medición (sección 3).
6. **Proponer soluciones por impacto/esfuerzo** (sección 4), con código concreto para ese componente.
7. **Aplicar solo si se pidió.** Por defecto: diagnosticar y proponer. Si se pide arreglar, un cambio por vez, sin alterar props, handlers ni comportamiento, y volver a medir.

## 1. Cómo medir

**Condiciones realistas**: build de producción (`vite preview`, `next start`), CPU con throttling 4× y red "Slow 4G" en DevTools, caché vacío, sin extensiones. El modo desarrollo es mucho más lento y con `StrictMode` renderiza dos veces: no usarlo para sacar conclusiones de tiempos, sí para contar renders y detectar causas.

**Datos de laboratorio vs campo**: Lighthouse y DevTools sirven para diagnosticar. Si hay datos de usuarios reales (PageSpeed/CrUX o `web-vitals` en producción), esos mandan.

| Métrica | Bueno | Mejorable | Malo |
|---|---|---|---|
| LCP (contenido principal visible) | ≤ 2,5 s | ≤ 4 s | > 4 s |
| INP (respuesta a toques) | ≤ 200 ms | ≤ 500 ms | > 500 ms |
| CLS (saltos de layout) | ≤ 0,1 | ≤ 0,25 | > 0,25 |
| TTFB (servidor) | ≤ 800 ms | ≤ 1,8 s | > 1,8 s |
| Frame (animación/scroll) | ≤ 16 ms | — | > 16 ms (tirones) |

**Herramientas**

- **React DevTools → Profiler**: grabar la interacción, ordenar por tiempo ("Ranked") y activar "Record why each component rendered". Es la herramienta principal para saber *qué componente* es caro.
- **DevTools → Performance**: grabar la acción lenta; buscar *long tasks* (> 50 ms), qué función las ocupa y si el costo es JavaScript, layout/style o paint.
- **DevTools → Network** y **Lighthouse**: carga inicial, cascada de requests, LCP.
- **Analizador de bundle**: Vite → `rollup-plugin-visualizer`; Next → `@next/bundle-analyzer`; webpack → `webpack-bundle-analyzer`; genérico → `npx source-map-explorer dist/**/*.js`.
- **DevTools → Memory**: para degradación con el uso (listeners, timers, referencias).

**Sonda reutilizable para medir cualquier componente** (solo para diagnóstico; no dejar en producción). Se envuelve el componente sospechoso y registra los renders lentos:

```jsx
import { Profiler } from 'react';

export function PerfProbe({ id, umbral = 8, children }) {
  const onRender = (compId, fase, actual, base) => {
    // actual = ms de este render; base = ms estimados sin memoización
    if (actual > umbral) {
      console.warn(`[perf] ${compId} (${fase}): ${actual.toFixed(1)}ms (base ${base.toFixed(1)}ms)`);
    }
  };
  return <Profiler id={id} onRender={onRender}>{children}</Profiler>;
}

// <PerfProbe id="CarruselPlanes"><CarruselPlanes {...props} /></PerfProbe>
```

Contar renders y ver qué prop cambió (solo desarrollo):

```jsx
import { useRef, useEffect } from 'react';

export function useWhyRender(nombre, props) {
  const previas = useRef(props);
  const cuenta = useRef(0);
  cuenta.current += 1;
  useEffect(() => {
    const cambios = Object.keys(props).filter((k) => !Object.is(props[k], previas.current[k]));
    if (cuenta.current > 1 && cambios.length) console.log(`[render #${cuenta.current}] ${nombre} cambió:`, cambios);
    previas.current = props;
  });
}
```

Notas: el `<Profiler>` está desactivado en builds de producción normales (hace falta un build de profiling para medir ahí). En DevTools, "Highlight updates when components render" muestra visualmente qué se repinta.

Si el entorno permite comandos, medir también el peso del build (`du -sh dist`, chunks con su tamaño gzip/brotli) y revisar dependencias pesadas.

## 2. Ficha de auditoría de un componente

Para cada componente sospechoso, revisar estos puntos y anotar lo que aparezca:

**Renderizado**
- ¿Cuántas veces se renderiza por interacción y por qué? (¿props que cambian de identidad, estado del padre, contexto?)
- ¿Recibe objetos, arrays o funciones creados en el render del padre (`style={{…}}`, `items={datos.filter(…)}`, `onClick={() => …}`)?
- ¿Se renderiza por un contexto que cambia seguido (hora, scroll, tema, usuario) y lo consume mucha gente?
- ¿Hay estado que vive más arriba de lo necesario (todo el árbol se actualiza por un campo de un formulario)?
- ¿`key` estable en listas (no el índice si se reordena o filtra)?
- ¿Hay React Compiler habilitado? Si es así, no agregar `memo`/`useMemo` a mano sin medir.

**Trabajo en el render y efectos**
- Cálculos pesados en el cuerpo del componente (ordenar, filtrar, formatear fechas con `Intl` en cada fila, parsear JSON).
- `useEffect` que hacen trabajo inicial grande, dependencias mal puestas que lo re-ejecutan, o que provocan un segundo render con `setState`.
- Timers (`setInterval` de la hora en vivo), listeners (`scroll`, `resize`), suscripciones o websockets: ¿se limpian? ¿actualizan estado de un componente grande en vez de un reloj chico y aislado?

**Listas y carruseles**
- ¿Cuántos nodos DOM genera? (Más de ~1.500 en la pantalla ya pesa.)
- ¿Renderiza todas las cards aunque se vean 1,2 a la vez? ¿Imágenes de todas cargando de golpe?

**Imágenes y medios**
- Peso y formato, `width`/`height` o `aspect-ratio`, `loading`, `fetchpriority`, `srcset`.
- ¿Es el elemento LCP? ¿Carga tarde porque depende de un fetch o de JavaScript?

**Estilos y animación**
- ¿Anima `width`/`height`/`top`/`left` (layout) en lugar de `transform`/`opacity`?
- `backdrop-blur` o `filter` sobre áreas grandes o apilados, sombras enormes, muchas capas.
- Listeners de scroll sin `{ passive: true }` o con trabajo pesado en cada evento.

**Datos**
- ¿Pide datos en cascada (el hijo espera al padre)? ¿Una request por fila (N+1)?
- ¿Trae campos de más, sin paginar, sin caché del cliente?
- ¿Muestra skeleton con la altura real o provoca saltos de layout?

**Carga y bundle**
- ¿El componente (o su librería) pesa mucho y se carga en la ruta inicial aunque no se vea (mapas, gráficos, editores, sheets, diálogos)?
- ¿Importa una librería completa para usar una función o un ícono?

**Memoria**
- Referencias que se acumulan (cachés sin límite, listeners sin remover, closures con datos grandes).

## 3. Síntoma → causa probable → cómo confirmarla

| Síntoma en el componente | Causa probable | Confirmar con |
|---|---|---|
| Toco y tarda en responder | Re-render masivo o handler con trabajo síncrono pesado | Profiler (tiempo y "why rendered"), Performance (long task) |
| El componente se renderiza muchas veces seguidas | Props con identidad nueva, contexto volátil, estado demasiado arriba, efecto que hace `setState` en cadena | `useWhyRender`, Profiler "Record why" |
| Toda la pantalla se actualiza cada segundo/15 s | Hora en vivo o timer con estado en un componente alto | Highlight updates; Profiler |
| Lista/carrusel lento al scrollear | Demasiados nodos, cards pesadas, imágenes sin diferir, `blur` costoso | Performance (frames largos, recalcular estilos/paint), conteo de nodos |
| Animación o sheet con tirones | Animar propiedades de layout, `backdrop-filter`, trabajo en JS durante la animación | Performance → pestaña de frames / capas |
| Pantalla vacía mucho tiempo al abrir | Bundle grande, render solo en cliente, cascada de datos | Network (cascada), analizador de bundle, LCP |
| Imagen principal aparece tarde | Pesada, lazy por error, sin prioridad, depende de JS | Network + elemento LCP en Lighthouse |
| El contenido salta al cargar | Imágenes/skeletons sin tamaño, fuentes, banners | CLS en Lighthouse, "Layout shift regions" |
| Se pone más lento con el uso | Fugas (timers/listeners/refs) | Memory → heap snapshots comparados |
| Un componente espera datos en cadena | Waterfall o N+1 | Network: requests escalonadas |

## 4. Soluciones, por impacto

Cada hallazgo indica el cambio concreto, el efecto esperado y la métrica que mejora. Ordenar en tres niveles.

### Rápidas (alto impacto, bajo esfuerzo)
- **Aislar lo que cambia seguido**: el reloj en vivo, el contador o el estado de un input van en un componente chico propio, así no re-renderizan al padre.
  ```jsx
  function HoraEnVivo() {
    const [ahora, setAhora] = useState(() => new Date());
    useEffect(() => {
      const t = setInterval(() => setAhora(new Date()), 15000);
      return () => clearInterval(t);
    }, []);
    return <time className="tabular-nums">{ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time>;
  }
  ```
- **Estabilizar identidades** solo donde el Profiler lo pidió: mover objetos/arrays constantes fuera del componente; `useCallback`/`useMemo` para lo que se pasa a hijos memoizados.
- **Imagen principal**: AVIF/WebP, `srcset` + `sizes`, `width`/`height`, `fetchpriority="high"` y sin `lazy`; las demás con `loading="lazy"` y `decoding="async"`.
- **Reservar espacio**: `aspect-ratio` en imágenes y skeletons con la altura final.
- **Animaciones** con `transform`/`opacity`; `will-change` solo durante la animación; listeners de scroll `{ passive: true }`.
- **Menos `backdrop-blur`**: dejarlo en barras y chips chicos, no en paneles grandes ni apilado.

### Medias (impacto alto, esfuerzo moderado)
- **`React.memo` en componentes caros con props estables** (cards de una lista, filas) y **no** donde no hay evidencia.
- **Bajar el estado** al componente que lo usa; partir contextos por frecuencia de cambio (uno estable y uno volátil); `useSyncExternalStore`/selectores para estado global.
- **Virtualizar listas largas** (`@tanstack/react-virtual`, `react-window`) o `content-visibility: auto` con `contain-intrinsic-size`.
- **Carga diferida de componentes pesados** que no se ven al inicio:
  ```jsx
  const Mapa = lazy(() => import('./Mapa'));
  <Suspense fallback={<MapaSkeleton />}>{abierto && <Mapa />}</Suspense>
  ```
- **Sacar trabajo del render**: cálculos con `useMemo` solo si miden caro; formatear una vez (un `Intl.DateTimeFormat` reutilizado, no uno por fila).
- **Interacciones fluidas**: `startTransition`/`useDeferredValue` para filtros y búsquedas; dividir tareas largas cediendo el hilo (`await scheduler.yield?.()` o `setTimeout(0)`).
- **Datos**: pedir en paralelo (`Promise.all`), eliminar waterfalls y N+1, paginar, traer solo lo necesario, caché del cliente (TanStack Query, SWR), prefetch al tocar.
- **Dependencias**: reemplazar las pesadas (`dayjs`/`date-fns` en vez de `moment`, íconos individuales, imports por función).
- **Limpiar fugas**: `return () => …` en cada efecto con timers/listeners/suscripciones.

### Estructurales (más esfuerzo, si lo anterior no alcanza)
- **SSR/SSG** del contenido principal en vez de pantalla vacía hasta que carga el JS.
- **Web Workers** para cálculo pesado.
- **Service worker** con caché del shell y *stale-while-revalidate* de datos.
- **CDN/caché en el borde**, brotli, `Cache-Control` con `immutable` en archivos con hash.
- **Replantear la API** (endpoint agregado, índices, paginación en servidor).
- **Presupuesto de rendimiento** en CI (Lighthouse CI, límite de tamaño del bundle).

## 5. Priorización

- **Impacto**: alto si afecta la carga inicial o la interacción principal, o mueve una métrica de "malo" a "bueno"; medio si mejora algo ya aceptable; bajo si es higiene.
- **Esfuerzo**: bajo (un archivo, minutos), medio (varios archivos, horas), alto (rediseño, días).
- Hacer primero alto impacto + bajo esfuerzo. No proponer micro-optimizaciones mientras haya problemas grandes sin resolver. Si todo está bien, decirlo.

## 6. Formato del informe

```
# Diagnóstico de rendimiento — <app / pantalla>

**Condiciones de medición:** <build, throttling, herramienta, fecha>
**Veredicto en una línea:** <qué componente va lento y por qué>

## Ranking de componentes (más costosos primero)
| Componente | Dónde vive | Costo medido | Problema principal |
| CarruselPlanes | Home | 42 ms/render, 9 renders | Re-render por reloj en vivo |

## Hallazgos

### 1. <Componente> — Impacto alto · Esfuerzo bajo
- **Qué le pasa:** <síntoma concreto>
- **Evidencia:** <número o dato medido>
- **Por qué:** <causa raíz>
- **Solución:** <pasos + código aplicado a este componente>
- **Mejora esperada:** <métrica y estimación>
- **Cómo verificar:** <medición a repetir>

### 2. ...

## Lo que está bien (no tocar)
<componentes revisados sin problemas>

## Plan sugerido
1. Rápidas  2. Medias  3. Estructurales

## Pendiente de medir
<hipótesis sin confirmar y qué medición las resuelve>
```

## Reglas de conducta

- **Concreto, no genérico**: "`CarruselPlanes` se renderiza 9 veces cuando cambia la hora porque el estado vive en `Home`" y no "optimizá los renders".
- **Causa raíz, no síntoma**: si el LCP es lento por el servidor, comprimir la imagen no lo arregla.
- **No memoizar a ciegas**: `memo`/`useMemo`/`useCallback` agregan costo y complejidad; solo con evidencia del Profiler.
- **Separar lo medido de lo estimado**; las mejoras esperadas son estimaciones hasta volver a medir.
- **No cambiar comportamiento, props ni handlers** al optimizar.
- **Si faltan datos** (no hay navegador, no se puede correr la app), pedir lo mínimo (perfil del Profiler exportado, informe de Lighthouse en JSON, HAR de la pestaña Network) y avanzar con lo deducible del código, marcando todo como hipótesis.
- **Quitar la instrumentación** (`PerfProbe`, `useWhyRender`) antes de entregar.

## Checklist final

- [ ] Síntoma acotado: qué componente o flujo, qué interacción, qué dispositivo.
- [ ] Medido en build de producción y condiciones de celular de gama media (o marcado como pendiente).
- [ ] Ranking de componentes por costo, con evidencia.
- [ ] Cada hallazgo: evidencia, causa raíz, solución concreta y forma de verificarla.
- [ ] Ordenado por impacto/esfuerzo; lo rápido y de alto impacto primero.
- [ ] Lo medido separado de lo supuesto; incluido lo que está bien.
- [ ] Si se aplicaron cambios: comportamiento intacto, instrumentación retirada y medición antes/después.