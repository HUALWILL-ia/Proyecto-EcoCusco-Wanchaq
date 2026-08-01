# EcoRutas Wanchaq — Backend (Fase 3)

API REST en Node.js + Express para el sistema de gestión inteligente de
residuos sólidos de la Municipalidad Distrital de Wanchaq. Esta fase migra
el almacenamiento a **PostgreSQL real** (con triggers de negocio y
auditoría automática) y agrega **GPS real** desde el celular del operador,
transmitido en vivo por Socket.IO.

## Requisitos

- Node.js 18 o superior (usa `fetch` global; se probó con Node 24).
- PostgreSQL 13+ instalado y corriendo localmente (se probó con PostgreSQL 17).
- Una cuenta de correo para el envío real de 2FA y credenciales (ver abajo).

## 1. Crear la base de datos

Todo el esquema (tablas, tipos ENUM, índices, triggers, auditoría y datos
semilla de Wanchaq) vive en un único archivo en la raíz del proyecto:
[`../baseDatos_eccoCusco.sql`](../baseDatos_eccoCusco.sql).

```bash
# 1. Crea la base de datos vacía (una sola vez, como superusuario):
psql -U postgres -c "CREATE DATABASE \"eccoCusco\" WITH ENCODING='UTF8' TEMPLATE=template0;"

# 2. Ejecuta el script completo contra esa base:
psql -U postgres -d eccoCusco -f ../baseDatos_eccoCusco.sql
```

También puedes usar el atajo `npm run db:init` (definido en `package.json`),
que ejecuta el mismo script con `psql` desde esta carpeta.

En Windows, si `psql` no está en el PATH, usa la ruta completa del
instalador, por ejemplo `"C:\Program Files\PostgreSQL\17\bin\psql.exe"`.

### Reiniciar la base desde cero

Si necesitas volver a un estado limpio (por ejemplo, después de pruebas):

```bash
psql -U postgres -c "DROP DATABASE \"eccoCusco\";"
psql -U postgres -c "CREATE DATABASE \"eccoCusco\" WITH ENCODING='UTF8' TEMPLATE=template0;"
psql -U postgres -d eccoCusco -f ../baseDatos_eccoCusco.sql
```

## 2. Instalar y configurar el backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eccoCusco
DB_USER=postgres
DB_PASSWORD=tu_password_local
```

y la sección de correo (ver más abajo). Luego:

```bash
npm run dev     # con nodemon, recarga automática
# o
npm start       # sin recarga
```

Si todo está bien configurado, verás en la consola:

```
EcoRutas Wanchaq API escuchando en http://localhost:4000 (development)
Conexión a PostgreSQL OK — base "eccoCusco" — hora del servidor de BD: ...
```

Si en cambio ves un error de conexión, revisa `DB_PASSWORD`/`DB_USER` en
`.env` y que el servicio de PostgreSQL esté corriendo.

## 3. Verificar que los triggers y la auditoría funcionan

El script SQL termina con una sección comentada de ejemplos listos para
pegar en `psql` (uno a la vez) que demuestran cada trigger, incluyendo los
casos que **deben fallar**. Ábrelo y busca `SECCIÓN 6 — EJEMPLOS DE
VERIFICACIÓN`. Un resumen:

| Trigger | Cómo probarlo | Resultado esperado |
|---|---|---|
| Zona activa | Insertar/actualizar un usuario con `zona_id` inexistente o de una zona `inactiva` | `ERROR: No se puede asignar una zona inactiva o inexistente` |
| Duplicados | Insertar un usuario con un correo/DNI ya existente | `ERROR: Ya existe una cuenta registrada con el correo ...` |
| Historial de incidencias | `UPDATE incidencias SET estado = 'resuelta' WHERE ...` | Aparece una fila nueva en `incidencias_historial` |
| `updated_at` | Cualquier `UPDATE` sobre `usuarios`, `rutas`, `camiones` o `incidencias` | La columna `updated_at` cambia a `NOW()` |
| Notificación por ruta completada | `UPDATE rutas SET estado = 'completada' WHERE ...` | Se crean notificaciones para los ciudadanos activos de esa zona |
| Bloqueo de eliminación | `DELETE FROM usuarios WHERE ...` (con historial asociado) | `ERROR: No se puede eliminar al usuario ...: tiene ... asignadas` |
| Camión en mantenimiento | Asignar un camión `mantenimiento` a una ruta con estado distinto de `pendiente` | `ERROR: No se puede asignar el camión ... está en mantenimiento` |

Para ver la auditoría generada automáticamente:

```sql
SELECT * FROM auditoria ORDER BY fecha DESC LIMIT 20;
SELECT * FROM incidencias_historial ORDER BY fecha DESC;
```

O desde la API (solo admin, con JWT): `GET /api/auditoria` y
`GET /api/incidencias/:id/historial` — también hay una pantalla dedicada en
el frontend: `admin/auditoria.html`.

Los errores de los triggers (`RAISE EXCEPTION`, código PostgreSQL `P0001`)
son traducidos automáticamente por `src/middlewares/errorHandler.middleware.js`
a una respuesta `{ success: false, message, code }` legible — el frontend
nunca ve un error crudo de PostgreSQL.

## 4. Configurar el envío de correo (gratis)

El backend envía correos reales para:
- El código de verificación en dos pasos (2FA) de operadores y administradores.
- Las credenciales iniciales cuando el admin crea una cuenta de operador.

Se soportan tres proveedores 100% gratuitos, seleccionables con la variable
`MAIL_PROVIDER` en `.env`. Si no configuras ninguno (o falla el envío), el
sistema **no se bloquea**: imprime el correo en la consola del servidor
("modo consola"), así que puedes probar todo el flujo sin salir de la terminal.

### Opción 1 — Gmail SMTP (por defecto)

1. Usa o crea una cuenta de Gmail para la municipalidad.
2. Activa la verificación en 2 pasos en esa cuenta:
   https://myaccount.google.com/security
3. Genera una "contraseña de aplicación" (16 caracteres) en:
   https://myaccount.google.com/apppasswords
4. En `.env`:
   ```
   MAIL_PROVIDER=gmail
   GMAIL_USER=tu_correo@gmail.com
   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
   ```

### Opción 2 — Resend (100 correos/día gratis)

1. Crea una cuenta en https://resend.com y genera una API key.
2. En `.env`:
   ```
   MAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=EcoRutas Wanchaq <onboarding@resend.dev>
   ```

### Opción 3 — Brevo (300 correos/día gratis)

1. Crea una cuenta en https://brevo.com, verifica un remitente y genera una API key.
2. En `.env`:
   ```
   MAIL_PROVIDER=brevo
   BREVO_API_KEY=xxxxxxxxxxxxxxxx
   BREVO_SENDER_EMAIL=tu_correo_verificado@dominio.com
   BREVO_SENDER_NAME=EcoRutas Wanchaq
   ```

Cambiar de proveedor no requiere tocar código: todo el backend llama a
`enviarCorreo({ to, subject, html })` desde `src/config/mailer.js`, que decide
internamente qué proveedor usar según `MAIL_PROVIDER`.

## Cuentas de prueba (datos semilla)

⚠️ **Solo para entorno de desarrollo.** Estas credenciales vienen del script de
datos semilla (`baseDatos_eccoCusco.sql`) y no deben usarse ni mostrarse en un
entorno de producción.

| Rol       | Correo                          | Contraseña     | Requiere 2FA |
|-----------|----------------------------------|----------------|--------------|
| Admin     | rquispe@munwanchaq.gob.pe        | Wanchaq2024    | Sí           |
| Operador  | jhuaman@munwanchaq.gob.pe        | Operador2024   | Sí           |
| Operador  | econdori@munwanchaq.gob.pe       | Operador2024   | Sí           |
| Ciudadano | mario.ccahuana@gmail.com         | Vecino2024     | No           |
| Ciudadano | fiorella.zuniga@gmail.com        | Vecino2024     | No           |

## Estructura

```
src/
├── config/        env.js, db.js (pool de PostgreSQL), mailer.js
├── repositories/  acceso a datos vía SQL — la única capa que conoce PostgreSQL
├── controllers/   lógica de negocio por módulo
├── routes/        definición de endpoints + validaciones
├── middlewares/    auth (JWT), roles, multer (uploads), validate, errorHandler
└── utils/         helpers (2FA, password temporal, plantillas de correo, logger)
```

Los repositorios exponen exactamente las mismas funciones que en la Fase 2
(mismos nombres, mismas formas de objeto en camelCase); solo cambió su
implementación interna, de leer/escribir JSON a ejecutar SQL contra
PostgreSQL. Los controladores y las rutas no cambiaron su lógica de negocio.

### Cómo viaja el "quién hizo el cambio" hasta los triggers

`auth.middleware.js` envuelve cada petición autenticada en
`conUsuarioActual(idDelUsuario, next)` (definido en `src/config/db.js`), que
usa `AsyncLocalStorage` para que, sin pasar ningún parámetro nuevo por los
repositorios, `db.query()` pueda ejecutar
`SELECT set_config('app.current_user_id', '<id>', true)` antes de cada
consulta. Los triggers de PostgreSQL leen ese valor con
`current_setting('app.current_user_id', true)` para registrar el
`usuario_id` en `auditoria` e `incidencias_historial`.

## GPS real (Fase 3)

- El operador transmite su ubicación real desde el navegador de su celular
  (`navigator.geolocation.watchPosition`) a `POST /api/gps/actualizar`.
- El backend guarda/actualiza (UPSERT) la última posición en
  `ubicaciones_gps` (una fila por ruta) y la difunde por Socket.IO a quien
  esté suscrito a esa ruta (`admin`) o a ese camión (`ciudadano`).
- `GET /api/gps/:rutaId` (admin) y `GET /api/gps/camion/:camionId`
  (ciudadano/admin) devuelven la última posición conocida como respaldo si
  el cliente no llegó a recibir el evento en tiempo real.

### Desplegar con HTTPS para probar el GPS en celulares reales

La API de Geolocalización del navegador **solo funciona en un contexto
seguro (HTTPS)** en celulares reales — en `localhost` sí funciona sin HTTPS,
pero eso solo sirve para probar en tu propia PC. Como los operadores
accederán desde celulares reales, necesitas HTTPS. Opciones gratuitas:

**Para pruebas rápidas sin desplegar nada:**
- [ngrok](https://ngrok.com) (plan gratuito): expone tu backend local con
  HTTPS público temporal.
  ```bash
  ngrok http 4000
  ```
  Usa la URL `https://xxxx.ngrok-free.app` como `API_BASE_URL` en
  `frontend/public/js/utils/api.js` mientras pruebas desde el celular, y agrégala
  también a `FRONTEND_URL`/CORS si sirves el frontend por otro túnel.

**Para un despliegue más permanente (ambos con HTTPS automático y capa gratuita):**
- **Backend:** [Render](https://render.com) o [Railway](https://railway.app)
  — despliega este backend como "Web Service", configura las variables de
  entorno (incluyendo una base PostgreSQL gestionada por el mismo proveedor,
  o cualquier PostgreSQL accesible por red), y usa la URL HTTPS que te den.
- **Frontend:** [Vercel](https://vercel.com) o [Netlify](https://netlify.com)
  — despliega `frontend/public/` como sitio estático. Actualiza
  `API_BASE_URL` en `frontend/public/js/utils/api.js` para que apunte a la URL
  HTTPS de tu backend desplegado, y `FRONTEND_URL` en el `.env` del backend
  para que el CORS de producción solo permita ese origen.

No se requiere ningún certificado propio: todas estas plataformas emiten
HTTPS automáticamente en sus dominios `*.onrender.com`, `*.up.railway.app`,
`*.vercel.app`, `*.netlify.app`, etc.

## Conectar con el frontend

El frontend (`../frontend`) ya está adaptado para consumir esta API: sus
`js/utils/auth-simulado.js` y `js/mocks/*.js` hacen `fetch()` a
`http://localhost:4000/api/...`. Para probarlo de punta a punta en desarrollo:

1. Levanta PostgreSQL y el backend (`npm run dev` en esta carpeta).
2. Sirve `frontend/public/` con cualquier servidor estático (por ejemplo la
   extensión "Live Server" de VS Code, o `npx serve frontend/public`).
3. Abre `index.html` en el navegador y navega el flujo normal (registro,
   login, 2FA, dashboards, CRUD de administración, GPS, auditoría, etc.).

Si el backend responde 401/403 en cualquier pantalla protegida, el frontend
limpia la sesión guardada y redirige automáticamente a `login.html`.

## Notas de la Fase 3

- El almacenamiento ya es PostgreSQL real (no hay más archivos JSON).
- Las imágenes de incidencias se guardan en `uploads/` (servidas en
  `/uploads/...`); en un entorno de producción real esto debería moverse a
  un bucket externo (S3-compatible).
- Los códigos 2FA ahora se guardan en la tabla `codigos_verificacion_2fa`
  (antes eran un `Map` en memoria en la Fase 2), por lo que sobreviven a un
  reinicio del servidor mientras no hayan expirado.
