---
name: suite-test
description: Genera una suite de pruebas completa para cualquier componente de la app (React, con Vitest o Jest + Testing Library) - renderizado, props, interacción, estados de carga/vacío/error, formularios, accesibilidad, timers, datos remotos y comportamiento mobile - y la deja corriendo y en verde. Usar siempre que el usuario pida "tests", "pruebas", "testear un componente", "cobertura", "suite de pruebas", "que no se rompa", "pruebas de regresión", "agregá tests a esto", o cuando termine de crear o rediseñar un componente y falten pruebas, aunque no diga la palabra "test". Sirve para cualquier proyecto y cualquier tipo de componente (botón, card, lista, carrusel, sheet, barra de pestañas, formulario, componente con datos).
---

# Suite de pruebas por componente

Meta: que cada componente tenga pruebas que **detecten roturas reales** y no se rompan por cambios internos inofensivos. Se prueba lo que el usuario ve y hace, no cómo está implementado.

Entregable: archivos de test junto a cada componente, **ejecutados y en verde**, más un resumen corto de qué cubren y qué quedó sin cubrir.

## Principios

1. **Probar comportamiento, no implementación.** Nada de leer estado interno, nombres de funciones ni estructura del DOM innecesaria. Si refactorizar sin cambiar lo visible rompe el test, el test estaba mal.
2. **Consultar como lo haría una persona.** Prioridad de consultas: `getByRole` (con `name`) → `getByLabelText` → `getByPlaceholderText` → `getByText` → `getByDisplayValue` → `getByAltText`/`getByTitle` → `getByTestId` (último recurso). Si un componente solo se puede encontrar con `data-testid`, suele ser señal de un problema de accesibilidad.
3. **Interactuar como una persona.** `userEvent.setup()` en lugar de `fireEvent`. Esperar con `findBy*` / `waitFor`, nunca con `setTimeout` reales.
4. **Un test, una razón para fallar.** Nombres en español que describan el comportamiento: `muestra el estado vacío cuando no hay reservas`.
5. **Sin snapshots grandes.** Un snapshot de todo el DOM no dice qué importa. Aceptables solo los chicos y deliberados.
6. **Tests independientes y deterministas.** Sin orden entre ellos, sin red real, sin hora real, sin azar sin semilla.
7. **No modificar el componente para testearlo** sin avisar. Si hace falta (un `aria-label`, un rol), proponerlo como cambio mínimo y explicarlo; es una mejora de accesibilidad, no un parche solo para el test.

## Flujo de trabajo

1. **Detectar el stack** leyendo `package.json` y la configuración: Vitest o Jest, Testing Library, `user-event`, `jest-dom`, MSW, axe, Playwright, TypeScript o JavaScript. Usar lo que ya hay. Si falta lo básico, proponer la instalación (sección 1) y pedir confirmación antes de tocar dependencias.
2. **Leer el componente** y sus hijos relevantes: props, estados, efectos, handlers, datos que consume, timers, contextos, rutas.
3. **Inventariar los comportamientos** con la matriz de la sección 2 y decidir qué casos se prueban.
4. **Escribir la suite** con la estructura de la sección 3, colocada junto al componente (`Componente.test.tsx`).
5. **Ejecutarla** (`npx vitest run Componente` o `npx jest Componente`) y arreglar hasta que pase.
6. **Comprobar que los tests sirven** (sección 5): romper a propósito el componente y ver que fallan.
7. **Reportar**: qué casos cubre, qué no, y cualquier cambio mínimo sugerido al componente.

Con varios componentes: empezar por los más usados y por los que tienen más lógica (formularios, datos, listas, sheets), no por los puramente visuales.

## 1. Preparación del entorno (si falta)

Paquetes de desarrollo habituales:

```
vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
msw vitest-axe            # datos simulados y accesibilidad
@playwright/test          # solo para lo que jsdom no puede medir (layout, toque real)
```

**`vite.config` / `vitest.config`:**

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  css: true,
  restoreMocks: true,
}
```

**`src/test/setup.ts`** (jsdom no trae varias APIs que las apps móviles usan):

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as axeMatchers from 'vitest-axe/matchers';
import { expect } from 'vitest';

expect.extend(axeMatchers);
afterEach(() => cleanup());

// matchMedia (modo oscuro, reduced-motion, breakpoints)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }),
});

// Observers y scroll
class ObserverFalso { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
vi.stubGlobal('IntersectionObserver', ObserverFalso);
vi.stubGlobal('ResizeObserver', ObserverFalso);
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
Element.prototype.scrollIntoView = vi.fn();
```

Si se usa Jest, es lo mismo cambiando `vi` por `jest` y `@testing-library/jest-dom` sin `/vitest`.

## 2. Matriz: qué probar en cada componente

Recorrer toda la lista y quedarse con lo que aplica. Un componente completo suele cubrir de 6 a 12 casos.

**Renderizado**
- Se renderiza con las props mínimas y muestra el contenido esperado.
- Con cada variante de prop (`variant`, `size`, `disabled`, `loading`), el resultado visible cambia como corresponde.
- Props opcionales ausentes no rompen nada (sin imagen, sin subtítulo, lista vacía).
- Plurales y textos dinámicos correctos (`1 reserva`, `5 planes`).

**Interacción**
- Los handlers se llaman con los argumentos correctos al tocar, escribir, enviar.
- Estados deshabilitados o en carga no disparan acciones.
- Teclado: `Enter`/`Espacio` activan botones, `Tab` recorre en orden lógico, `Escape` cierra lo que se abre.
- Controles compuestos: selección única (`radiogroup`), pestañas (`tablist`), desplegables (`aria-expanded`).

**Estados**
- Carga: se ve el skeleton o indicador, y desaparece al llegar los datos.
- Vacío: aparece el mensaje y la acción sugerida.
- Error: aparece un mensaje legible y el botón "Reintentar" funciona.
- Offline o sin conexión, si el componente lo maneja.

**Datos remotos**
- Pide los datos correctos (URL, parámetros) y los muestra.
- Maneja respuestas lentas, fallidas y vacías.
- No pide de más (sin duplicados al re-renderizar).

**Tiempo y efectos**
- Hora en vivo, contadores, polling: se actualizan con el tiempo simulado.
- Los timers y listeners se limpian al desmontar (no hay actualizaciones después).

**Accesibilidad**
- Sin violaciones de `axe` en cada estado importante.
- Roles, nombres accesibles y `aria-*` correctos; iconos decorativos con `aria-hidden`; botones de solo ícono con `aria-label`.
- Foco: dónde queda al abrir/cerrar un sheet o diálogo; el foco se devuelve al elemento que lo abrió.

**Mobile y adaptación**
- Con `prefers-reduced-motion`, el componente sigue funcionando (y no depende de la animación para mostrar contenido).
- Variantes por breakpoint que cambian contenido (no solo estilos) se prueban simulando `matchMedia`.
- Lo que depende de layout real (tamaño táctil de 44px, snap del carrusel, safe areas, teclado en pantalla) **no se puede medir en jsdom**: va en Playwright con emulación de celular (sección 4).

## 3. Estructura de la suite

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, it, expect, vi } from 'vitest';
import { Componente } from './Componente';

// Fábrica de props: un solo lugar para los datos base
const props = (extra = {}) => ({ titulo: 'Plan de ejemplo', onSeleccionar: vi.fn(), ...extra });

describe('Componente', () => {
  describe('renderizado', () => {
    it('muestra el título y la acción principal', () => {
      render(<Componente {...props()} />);
      expect(screen.getByRole('heading', { name: 'Plan de ejemplo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reservar/i })).toBeEnabled();
    });
  });

  describe('interacción', () => {
    it('llama a onSeleccionar al tocar el botón', async () => {
      const user = userEvent.setup();
      const p = props();
      render(<Componente {...p} />);
      await user.click(screen.getByRole('button', { name: /reservar/i }));
      expect(p.onSeleccionar).toHaveBeenCalledTimes(1);
    });
  });

  describe('accesibilidad', () => {
    it('no tiene violaciones detectables', async () => {
      const { container } = render(<Componente {...props()} />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
```

### Plantillas por tipo de componente

**Datos remotos (MSW v2):**

```tsx
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('muestra las reservas cuando la API responde', async () => {
  server.use(http.get('/api/reservas', () => HttpResponse.json([{ id: 1, nombre: 'Cena' }])));
  render(<Reservas />);
  expect(screen.getByRole('status')).toBeInTheDocument();           // skeleton / cargando
  expect(await screen.findByText('Cena')).toBeInTheDocument();
});

it('muestra el error y permite reintentar', async () => {
  const user = userEvent.setup();
  server.use(http.get('/api/reservas', () => new HttpResponse(null, { status: 500 })));
  render(<Reservas />);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  server.use(http.get('/api/reservas', () => HttpResponse.json([{ id: 1, nombre: 'Cena' }])));
  await user.click(screen.getByRole('button', { name: /reintentar/i }));
  expect(await screen.findByText('Cena')).toBeInTheDocument();
});
```

**Hora en vivo / timers:**

```tsx
it('actualiza la hora cada 15 segundos y limpia el intervalo', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-14T12:45:00'));
  const { unmount } = render(<HoraEnVivo />);
  expect(screen.getByText('12:45')).toBeInTheDocument();

  act(() => { vi.advanceTimersByTime(15 * 60 * 1000); });
  expect(screen.getByText('13:00')).toBeInTheDocument();

  unmount();
  expect(vi.getTimerCount()).toBe(0);      // no quedan timers vivos
  vi.useRealTimers();
});
```
(Con `userEvent` y timers falsos: `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.)

**Formulario:**

```tsx
it('valida, muestra el error y envía con datos correctos', async () => {
  const user = userEvent.setup();
  const onEnviar = vi.fn();
  render(<FormContacto onEnviar={onEnviar} />);

  await user.click(screen.getByRole('button', { name: /enviar/i }));
  expect(await screen.findByText(/ingresá un email válido/i)).toBeInTheDocument();
  expect(onEnviar).not.toHaveBeenCalled();

  await user.type(screen.getByLabelText(/email/i), 'ana@correo.com');
  await user.click(screen.getByRole('button', { name: /enviar/i }));
  expect(onEnviar).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@correo.com' }));
});
```

**Bottom sheet / diálogo:**

```tsx
it('abre, atrapa el foco, cierra con Escape y devuelve el foco', async () => {
  const user = userEvent.setup();
  render(<ConSheet />);
  const abrir = screen.getByRole('button', { name: /ver detalle/i });

  await user.click(abrir);
  const dialogo = screen.getByRole('dialog');
  expect(dialogo).toHaveAttribute('aria-modal', 'true');
  expect(within(dialogo).getByRole('button', { name: /cerrar/i })).toHaveFocus();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(abrir).toHaveFocus();
});
```
Si el sheet empuja una entrada al historial, probar también que `window.history.back()` (o un evento `popstate`) lo cierra.

**Carrusel / lista:**
- Renderiza exactamente tantas cards como datos, y tantos *dots* como cards.
- Tocar un dot o los controles mueve a la card correcta (`scrollTo`/`scrollIntoView` llamado con lo esperado, o el elemento activo cambia).
- Lista vacía muestra el estado vacío, no un carrusel sin cards.
- El snap, el ancho de ~88% y el asomo de la siguiente card **van en Playwright**.

**Barra de pestañas / navegación:**
- Muestra los destinos esperados y marca el activo con `aria-current="page"`.
- Tocar un destino navega (usar `MemoryRouter` con `initialEntries`).
- Tocar la pestaña activa vuelve al inicio (según la lógica del componente).
- Las insignias (badges) aparecen solo con valor mayor a cero.

**Botón / card simple:** variantes, `disabled`, nombre accesible, handler, y que un ícono decorativo tenga `aria-hidden`.

**Contexto, router o proveedores:** envolver con una función `renderConProviders(ui, opciones)` en `src/test/utils.tsx` y reutilizarla en toda la suite.

## 4. Lo que jsdom no ve: Playwright con emulación móvil

jsdom no calcula layout. Para tamaño táctil, snap, safe areas, scroll real, teclado y gestos, usar Playwright:

```ts
import { test, expect, devices } from '@playwright/test';
test.use({ ...devices['iPhone 13'] });

test('los botones del hero miden al menos 44px de alto', async ({ page }) => {
  await page.goto('/');
  for (const boton of await page.getByRole('button').all()) {
    const caja = await boton.boundingBox();
    expect(caja!.height).toBeGreaterThanOrEqual(44);
  }
});

test('el carrusel deja asomar la siguiente card', async ({ page }) => {
  await page.goto('/');
  const [primera, segunda] = await page.locator('[data-carrusel] > *').all();
  const a = await primera.boundingBox(); const b = await segunda.boundingBox();
  expect(b!.x).toBeLessThan(page.viewportSize()!.width);   // la segunda ya se ve parcialmente
  expect(a!.width).toBeLessThan(page.viewportSize()!.width);
});
```

Probar al menos un viewport de iPhone y uno de Android (`devices['Pixel 7']`), y el comportamiento sin hover. Esta capa es opcional; se agrega cuando el usuario la pide o cuando el componente depende de layout.

## 5. Verificar que los tests sirven

Una suite en verde no demuestra nada si nunca puede fallar. Antes de entregar:

1. **Romper a propósito** el componente (cambiar un texto, quitar el handler, invertir una condición, no limpiar un intervalo) y comprobar que al menos un test falla. Volver a dejarlo como estaba.
2. **Ver el test fallar primero** cuando se escribe para un bug concreto.
3. **Correr la suite 2–3 veces** (y en orden aleatorio si se puede: `--sequence.shuffle`) para descartar tests inestables.
4. **Revisar la cobertura como guía, no como meta**: `npx vitest run --coverage`. Ramas sin cubrir en lógica importante sí merecen un test; el 100% de líneas no es el objetivo.

## 6. Errores comunes a evitar

- Consultar por clases CSS o por la estructura del DOM.
- `waitFor` con aserciones múltiples o con efectos secundarios adentro.
- `await` olvidado en `userEvent` o en `findBy*` (el test pasa por casualidad).
- Mockear el componente que se está probando, o mockear tanto que no se prueba nada real.
- Dejar timers falsos activos: siempre `vi.useRealTimers()` al terminar.
- Depender de la fecha o la hora real: fijar con `vi.setSystemTime`.
- Aserciones vagas (`toBeTruthy`, `toBeDefined`) donde se puede ser exacto.
- Un único test gigante que cubre todo.
- Tests que pasan solos pero fallan juntos por estado compartido (mocks sin restaurar, `localStorage` sin limpiar).

## 7. Formato del reporte final

```
# Pruebas — <Componente>

**Archivo:** src/components/Componente.test.tsx
**Resultado:** 11 tests, todos en verde (3 corridas, orden aleatorio)

## Casos cubiertos
- Renderizado: variantes, props ausentes, plurales
- Interacción: toque, teclado, deshabilitado
- Estados: carga, vacío, error con reintento
- Accesibilidad: axe sin violaciones; foco al abrir y cerrar
- Tiempo: hora en vivo y limpieza del intervalo

## Verificación
- Rompí a propósito <qué> y fallaron <cuáles> (revertido).

## No cubierto
- Tamaño táctil y snap del carrusel (requiere Playwright)
- <otras ramas o casos, con el motivo>

## Cambios sugeridos al componente (opcionales)
- Agregar `aria-label` al botón de ícono de cerrar (mejora accesibilidad y la consulta en tests)
```

## Reglas de conducta

- **Usar lo que el proyecto ya tiene** (runner, utilidades, convenciones de nombres); no migrar de herramienta sin que se pida.
- **No inventar APIs ni props**: leer el componente real antes de escribir.
- **No tocar el código del componente** sin avisar; proponer cambios mínimos y explicarlos.
- **Ejecutar siempre los tests.** Si no se pueden correr (sin dependencias o sin acceso), entregarlos igual, decir claramente que no se ejecutaron y qué comando correr.
- **Ser honesto con los límites**: decir qué no se cubrió y por qué, en lugar de aparentar cobertura total.
- **Pocos tests buenos antes que muchos frágiles.**

## Checklist final

- [ ] Stack detectado y respetado; setup mínimo agregado solo si faltaba y con confirmación.
- [ ] Consultas por rol/etiqueta; `userEvent` y `findBy*`; sin esperas reales.
- [ ] Cubiertos: renderizado, interacción, estados (carga/vacío/error), accesibilidad y lo que aplique (datos, timers, foco, teclado).
- [ ] Sin red, hora ni azar reales; timers y mocks restaurados.
- [ ] Tests ejecutados en verde, varias veces, sin inestabilidad.
- [ ] Comprobado que fallan cuando el componente se rompe a propósito.
- [ ] Lo que depende de layout está derivado a Playwright o declarado como no cubierto.
- [ ] Componente original intacto; cambios sugeridos explicados.
- [ ] Reporte con qué se cubrió, qué no y por qué.