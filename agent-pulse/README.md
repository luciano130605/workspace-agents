# Pulse · Monitor de agentes Codex

Proyecto React + Vite con backend Node, interfaz móvil tipo app y Web Push. Sigue la guía local native-app-web.md: shell con dvh, navegación inferior, áreas seguras, sheets accesibles, atrás del sistema, temas claro/oscuro, movimiento reducido, caché offline y PWA.

## Iniciar

Requiere Node 22.13+ (recomendado Node 24), npm y Codex instalado con sesiones en esta computadora.

~~~powershell
cd C:\Users\lucia\OneDrive\Escritorio\programacion\IA\agent-pulse
npm install
npm run build
npm start
~~~

Abrir http://127.0.0.1:4318. Esta modalidad incluye service worker, instalación PWA y notificaciones. El proceso debe permanecer encendido para monitorear y enviar avisos.

Para desarrollo: npm run dev (frontend http://127.0.0.1:5173, backend 4318). El service worker se habilita en el build, no en desarrollo. Pruebas: npm test. Regenerar íconos: node scripts/icons.mjs.

## Qué muestra

- Últimas 60 sesiones no archivadas de Codex: proyecto, modelo, actividad reciente, tarea finalizada/interrumpida y estado sin confirmar.
- Tokens acumulados, entrada, salida, caché y aproximación de contexto de la última llamada.
- Cupo principal y extendido de la cuenta, porcentaje disponible y cuenta regresiva al horario reportado de renovación.
- Búsqueda, filtros, detalles, historial de alertas y modo demo explícito separado de los datos reales.
- Push por renovación prevista/confirmada, 90% de cupo utilizado y transiciones de tarea activa a finalizada/interrumpida; preferencias por dispositivo y prueba de entrega.

## Conexión real a Codex

El backend abre state_*.sqlite de CODEX_HOME en **solo lectura** y lee como máximo los últimos 2 MiB del archivo de eventos de cada sesión. No envía prompts, respuestas ni credenciales al navegador. Se transmiten títulos de tarea, proyectos y métricas; los títulos también forman parte de los avisos push.

Cada 60 segundos intenta consultar account/rateLimits/read mediante un proceso codex app-server, con initialize/initialized. Nunca inicia turnos ni ejecuta tareas. Encuentra automáticamente el ejecutable de la app de Windows en .codex/packages/app-server-daemon/current/bin/codex.exe, o utiliza codex desde PATH. Se puede configurar CODEX_BIN con una ruta absoluta. La autenticación la administra Codex.

Si esa consulta falla, muestra los límites del evento token_count más reciente, con fuente, fecha observada y error de consulta. No lee auth.json. La base y los eventos locales son formatos internos que podrían cambiar; su lector está aislado en server/codex.mjs.

Actividad reciente se **infiere**, no es un estado remoto autoritativo: un comienzo o evento de ejecución reciente sin cierre observado. Después de 3 minutos sin eventos pasa a “Sin confirmar”. Los cierres se detectan por eventos explícitos. Una sesión que no emita eventos o cuya parte relevante quede fuera de la cola puede quedar sin confirmar. La app no inventa ETA ni porcentaje de progreso de tareas.

Los tokens acumulados incluyen entradas reutilizadas y no equivalen a tokens restantes del plan. Llegar a cero en el contador significa que llegó la hora prevista, no confirma una renovación: se espera un cambio de ventana y menor consumo reportado por Codex.

Documentación oficial: https://learn.chatgpt.com/docs/app-server (account/rateLimits/read). Web Push: https://developer.mozilla.org/en-US/docs/Web/API/Push_API.

## Activar notificaciones

1. Ejecutar el build y el servidor, abrir el panel y entrar en Avisos.
2. Pulsar Activar notificaciones y aceptar el permiso del navegador.
3. Enviar un aviso de prueba.

Las claves VAPID se generan al iniciar y se conservan con las suscripciones y el historial en .data/monitor.json (ignorado por Git). Conservar esta carpeta entre reinicios. No compartirla. Las suscripciones se eliminan cuando el servicio devuelve 404/410. Los avisos tienen identificadores persistidos para evitar duplicados; se prioriza no repetir, no se garantiza entrega exacta. Si falla el proveedor, el evento permanece en el historial y el envío no se reintenta automáticamente.

Configurar VAPID_SUBJECT con un mailto: de contacto real al desplegar para uso continuo. El valor inicial es un contacto de ejemplo. El servidor verifica endpoints de servicios push conocidos. No requiere Firebase ni una API key de OpenAI.

En iOS las notificaciones requieren la PWA instalada desde Safari (Compartir → Agregar a pantalla de inicio). El navegador, el sistema, la conectividad y la configuración de batería controlan la entrega. El backend debe seguir activo incluso cuando la PWA está cerrada; el navegador no mantiene los temporizadores del servidor.

## Usar desde el celular

La configuración inicial escucha **solo en loopback**. Para conectar un celular, usar una dirección HTTPS que llegue a esta computadora mediante un proxy privado/VPN, configurar el origen exacto y una clave fuerte. No publicar el puerto sin autenticación.

Ejemplo de variables en PowerShell (reemplazar valores):

~~~powershell
$env:MONITOR_TOKEN = 'una-clave-aleatoria-de-al-menos-24-caracteres'
$env:ALLOWED_ORIGINS = 'https://pulse.tu-dominio.example'
$env:VAPID_SUBJECT = 'mailto:tu-correo@example.com'
npm start
~~~

El proxy HTTPS reenvía al puerto local 4318. Si el proxy está en otra máquina, configurar HOST con la interfaz privada y proteger ese enlace. HOST distinto de loopback exige MONITOR_TOKEN. Todas las rutas /api requieren Bearer cuando hay token; ingresar esa clave desde Ajustes. No compartir claves por URL. ALLOWED_ORIGINS acepta orígenes separados por coma; no habilita CORS, se espera frontend/backend bajo el mismo origen.

El token se guarda en sessionStorage, solo durante la sesión de esa pestaña. Los datos recientes se guardan en localStorage para mostrarlos offline; no utilizar en un dispositivo compartido. Los datos API no se guardan en el service worker. El shell y los íconos sí se precachean, y las actualizaciones requieren pulsar Actualizar.

## Variables

| Variable | Por defecto | Uso |
| --- | --- | --- |
| CODEX_HOME | ~/.codex | Carpeta local de Codex |
| CODEX_BIN | Detección automática / PATH | Ejecutable Codex |
| PORT | 4318 | Puerto backend |
| HOST | 127.0.0.1 | Interfaz de escucha |
| MONITOR_TOKEN | Sin definir en loopback | Clave para acceso remoto |
| ALLOWED_ORIGINS | localhost / 127.0.0.1 | Orígenes HTTPS adicionales |
| VAPID_SUBJECT | mailto:admin@example.com | Contacto Web Push |

## Estructura

- src/main.jsx: pantallas, navegación, estado de conexión y preferencias.
- src/style.css: diseño adaptable y accesibilidad de movimiento.
- server/codex.mjs: adaptador de Codex, lectura SQLite y RPC.
- server/alerts.mjs: reglas puras de transición y cupos.
- server/index.mjs: API local, persistencia y entrega push.
- public/push-sw.js: recepción push y apertura de Avisos.
- tests/monitor.test.mjs: parseo, caducidad, renovación y deduplicación por transición.

## Límites de esta versión

La conexión es a las sesiones locales de esta computadora; no agrega equipos ni cuentas de Codex Cloud. No controla ni pausa agentes. El servidor debe seguir encendido. El estado de actividad y el contexto son aproximaciones identificadas en pantalla. No hay tiempo de finalización disponible. La háptica es progresiva y puede no funcionar en iOS. El acceso HTTPS desde un celular depende de configurar la red/proxy; no queda publicado automáticamente.
