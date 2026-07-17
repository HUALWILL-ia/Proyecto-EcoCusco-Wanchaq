# EcoRutas Wanchaq

Sistema de gestión inteligente de residuos sólidos para la **Municipalidad
Distrital de Wanchaq** (Cusco, Perú). Permite a los vecinos consultar
horarios de recolección y seguir al camión en un mapa en vivo, a los
operadores de campo registrar recolecciones e incidencias desde el celular,
y al equipo municipal administrar zonas, flota, rutas, usuarios y reportes
desde un panel con auditoría automática.

## Índice

- [¿Qué incluye el sistema?](#qué-incluye-el-sistema)
- [Tecnologías](#tecnologías)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Puesta en marcha](#puesta-en-marcha)
- [Cuentas de prueba](#cuentas-de-prueba)
- [Variables de entorno y seguridad](#variables-de-entorno-y-seguridad)
- [Fases del proyecto](#fases-del-proyecto)
- [Documentación adicional](#documentación-adicional)

## ¿Qué incluye el sistema?

Tres roles, cada uno con su propio panel:

- **🧑‍🤝‍🧑 Ciudadano** — registro libre, consulta de horarios por zona,
  seguimiento GPS en vivo del camión de su sector, reporte de incidencias
  (con foto), historial de incidencias, notificaciones y edición de perfil.
- **🚛 Operador de recolección** — cuenta creada solo por el admin (con
  credenciales temporales enviadas por correo), acceso protegido con 2FA,
  ruta del día con progreso, registro de recolecciones, reporte de
  incidencias, transmisión de su ubicación GPS real desde el celular, y
  cambio de su contraseña temporal desde "Mi perfil".
- **🏛️ Coordinador municipal (admin)** — gestión de usuarios, zonas, tipos de
  residuo, flota de camiones y rutas; alta de operadores; supervisión de
  incidencias y recolecciones; reportes (PDF/Excel); y una pantalla de
  **auditoría** con el historial de cambios generado automáticamente por
  triggers de PostgreSQL.

Funcionalidades transversales:

- **Autenticación real** con JWT y verificación en dos pasos (2FA) por
  correo electrónico para operadores y administradores.
- **PostgreSQL real** con triggers de integridad de negocio (zonas activas,
  duplicados, camiones en mantenimiento, bloqueo de eliminaciones con
  dependencias) y auditoría automática de cambios.
- **GPS en vivo** transmitido desde el navegador del celular del operador y
  visualizado en tiempo real (Socket.IO) en los mapas del ciudadano y del
  admin.

## Tecnologías

| Capa | Stack |
|---|---|
| Frontend | HTML, CSS y JavaScript "vanilla" (sin framework ni build step) |
| Backend | Node.js + Express, JWT, bcrypt, Socket.IO, Multer, PDFKit/ExcelJS |
| Base de datos | PostgreSQL (triggers, funciones, auditoría) |
| Correo | Nodemailer (Gmail SMTP) / Resend / Brevo — intercambiables por variable de entorno |

## Estructura del proyecto

```
ecorutas-cusco-wanchaq/
├── baseDatos_eccoCusco.sql   # Script único: esquema + triggers + auditoría + datos semilla
│
├── backend/                  # API REST (Node.js + Express)
│   ├── server.js             # Punto de entrada (HTTP + Socket.IO)
│   ├── .env.example          # Plantilla de variables de entorno
│   ├── uploads/              # Fotos de incidencias subidas por operadores
│   └── src/
│       ├── config/           # env.js, db.js (pool de PostgreSQL), mailer.js
│       ├── routes/           # Definición de endpoints + validaciones por módulo
│       ├── controllers/      # Lógica de negocio por módulo
│       ├── repositories/     # Única capa que ejecuta SQL contra PostgreSQL
│       ├── middlewares/      # auth (JWT), roles, uploads, validate, errorHandler
│       └── utils/            # 2FA, contraseñas temporales, plantillas de correo, logger
│
└── frontend/                  # Interfaz (HTML/CSS/JS vanilla, sin build)
    ├── assets/logos/          # Logo institucional (favicon + marca)
    ├── css/                   # variables, base, layout y componentes
    ├── js/
    │   ├── utils/             # api.js (cliente HTTP), auth-simulado.js (sesión/JWT), ui.js, validaciones.js
    │   ├── mocks/              # Puente hacia la API real (mismos nombres de función que la Fase 1)
    │   └── pages/              # Un archivo por pantalla (ej. operador-dashboard.js)
    └── public/                 # Páginas HTML servidas — este es el "web root" del frontend
        ├── index.html, login.html, registro-ciudadano.html, verificacion-2fa.html
        ├── admin/              # Panel del coordinador municipal
        ├── operador/           # Panel del operador de recolección
        └── ciudadano/          # Panel del vecino
```

## Requisitos previos

- **Node.js** 18 o superior (probado con Node 24).
- **PostgreSQL** 13 o superior (probado con PostgreSQL 17), corriendo localmente.
- Una cuenta de correo para el envío real de 2FA y credenciales (Gmail,
  Resend o Brevo — ver [`backend/README.md`](backend/README.md)).
- Cualquier servidor estático para el frontend (extensión "Live Server" de
  VS Code, o `npx serve`).

## Puesta en marcha

1. **Base de datos** — crea la base vacía y ejecuta el script único:

   ```bash
   psql -U postgres -c "CREATE DATABASE \"eccoCusco\" WITH ENCODING='UTF8' TEMPLATE=template0;"
   psql -U postgres -d eccoCusco -f baseDatos_eccoCusco.sql
   ```

2. **Backend**:

   ```bash
   cd backend
   npm install
   cp .env.example .env   # completa DB_PASSWORD y la sección de correo
   npm run dev
   ```

   Debe quedar escuchando en `http://localhost:4000` — verifica en la
   consola que aparezca `Conexión a PostgreSQL OK`. Los detalles de cada
   variable de `.env` (correo, HTTPS, despliegue) están en
   [`backend/README.md`](backend/README.md).

3. **Frontend** — sirve la carpeta `frontend/public/` con cualquier servidor
   estático (por ejemplo la extensión "Live Server" de VS Code, o
   `npx serve frontend/public`) y abre `index.html`. Ya está configurado
   para llamar a `http://localhost:4000/api`.

Para probar el GPS real desde un celular (no solo en tu propia PC) necesitas
HTTPS — ver "Desplegar con HTTPS" en [`backend/README.md`](backend/README.md)
(ngrok para pruebas rápidas, o Render/Railway + Vercel/Netlify para un
despliegue gratuito permanente).

## Cuentas de prueba

⚠️ **Solo para entorno de desarrollo.** Vienen del script de datos semilla
— no se muestran en la interfaz del login por seguridad; úsalas solo para
probar el sistema localmente. La lista completa (incluye una segunda cuenta
de operador y ciudadano) está en [`backend/README.md`](backend/README.md#cuentas-de-prueba-datos-semilla).

| Rol | Correo | Contraseña |
|---|---|---|
| Admin | rquispe@munwanchaq.gob.pe | Wanchaq2024 |
| Operador | jhuaman@munwanchaq.gob.pe | Operador2024 |
| Ciudadano | mario.ccahuana@gmail.com | Vecino2024 |

Los correos `@munwanchaq.gob.pe` son ficticios (no existen de verdad), así
que el código de 2FA de esas cuentas nunca llegará a ningún lado. Si quieres
probar el login de admin/operador con 2FA real, actualiza el correo de esa
cuenta en la base de datos a uno que puedas revisar:

```sql
UPDATE usuarios SET correo = 'tu_correo_real@gmail.com' WHERE correo = 'rquispe@munwanchaq.gob.pe';
```

## Variables de entorno y seguridad

- `backend/.env` contiene credenciales reales (contraseña de PostgreSQL,
  contraseña de aplicación de Gmail, `JWT_SECRET`) y **nunca se sube al
  repositorio** — está excluido en `.gitignore`. Cada quien debe crear el
  suyo a partir de `backend/.env.example`.
- Antes de subir cambios a GitHub, revisa que `git status` no incluya
  `backend/.env` ni `backend/node_modules/`.
- Las contraseñas de usuarios se guardan como hash de bcrypt: nadie con
  acceso a la base de datos (ni un atacante que la robe) puede recuperar la
  contraseña original en texto plano.

## Fases del proyecto

1. **Fase 1 (completa):** interfaces HTML/CSS/JS puro con datos simulados
   en `localStorage`.
2. **Fase 2 (completa):** backend Express real, JWT, 2FA por correo,
   almacenamiento temporal en JSON, frontend conectado vía `fetch()`.
3. **Fase 3 (completa):** PostgreSQL real con triggers de integridad/negocio
   y auditoría automática (tabla `auditoria` + `incidencias_historial`),
   endpoint y pantalla de auditoría (`admin/auditoria.html`), y GPS real
   transmitido desde el celular del operador y visualizado en vivo (Socket.IO)
   en los mapas del ciudadano y del admin.

## Documentación adicional

[`backend/README.md`](backend/README.md) profundiza en lo que este archivo
solo resume: cómo probar cada trigger de PostgreSQL, cómo configurar cada
proveedor de correo, cómo funciona la auditoría por debajo (`AsyncLocalStorage`),
la arquitectura del GPS en vivo, y cómo desplegar con HTTPS gratis
(ngrok / Render / Railway / Vercel / Netlify).
