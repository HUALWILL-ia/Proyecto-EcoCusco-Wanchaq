/**
 * utils/ui.js
 * Componentes de interfaz compartidos entre todas las páginas: toasts,
 * modales, sidebar (admin/operador), navbar (ciudadano) y footer institucional.
 * Fase 1 — JS vanilla, sin frameworks.
 */

/* ---------------------------------------------------------------------- */
/* Toasts                                                                  */
/* ---------------------------------------------------------------------- */

const TOAST_ICONOS = {
  success: '✅',
  error: '⛔',
  warning: '⚠️',
  info: 'ℹ️',
};

function asegurarContenedorToasts() {
  let contenedor = document.querySelector('.toast-container');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.className = 'toast-container';
    contenedor.setAttribute('aria-live', 'polite');
    document.body.appendChild(contenedor);
  }
  return contenedor;
}

/**
 * Muestra un toast temporal.
 * @param {'success'|'error'|'warning'|'info'} tipo
 * @param {string} titulo
 * @param {string} mensaje
 * @param {number} duracionMs
 */
function mostrarToast(tipo, titulo, mensaje, duracionMs = 4500) {
  const contenedor = asegurarContenedorToasts();
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONOS[tipo] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${titulo}</div>
      <div class="toast-message">${mensaje}</div>
    </div>
    <button class="toast-close" aria-label="Cerrar notificación">&times;</button>
  `;
  toast.querySelector('.toast-close').addEventListener('click', () => cerrarToast(toast));
  contenedor.appendChild(toast);

  setTimeout(() => cerrarToast(toast), duracionMs);
  return toast;
}

function cerrarToast(toast) {
  if (!toast || !toast.parentElement) return;
  toast.classList.add('hide');
  setTimeout(() => toast.remove(), 220);
}

/* ---------------------------------------------------------------------- */
/* Modales                                                                 */
/* ---------------------------------------------------------------------- */

function abrirModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add('show');
}

function cerrarModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('show');
}

// Cierra cualquier modal si se hace clic en el overlay (fuera del cuadro)
document.addEventListener('click', (ev) => {
  if (ev.target.classList && ev.target.classList.contains('modal-overlay')) {
    ev.target.classList.remove('show');
  }
});

/* ---------------------------------------------------------------------- */
/* Navegación: Sidebar (admin/operador) y Navbar (ciudadano)               */
/* ---------------------------------------------------------------------- */

const NAV_ADMIN = [
  { grupo: 'Panel', items: [
    { href: 'dashboard.html', icono: '📊', texto: 'Dashboard' },
  ]},
  { grupo: 'Gestión', items: [
    { href: 'usuarios.html', icono: '👥', texto: 'Usuarios' },
    { href: 'crear-operador.html', icono: '➕', texto: 'Crear operador' },
    { href: 'zonas.html', icono: '🗺️', texto: 'Zonas' },
    { href: 'tipos-residuo.html', icono: '🗑️', texto: 'Tipos de residuo' },
    { href: 'camiones.html', icono: '🚛', texto: 'Camiones' },
    { href: 'rutas.html', icono: '🧭', texto: 'Rutas' },
  ]},
  { grupo: 'Operación', items: [
    { href: 'incidencias.html', icono: '🚨', texto: 'Incidencias' },
    { href: 'historial-recolecciones.html', icono: '📋', texto: 'Historial de recolecciones' },
    { href: 'reportes.html', icono: '📈', texto: 'Reportes' },
  ]},
  { grupo: 'Sistema', items: [
    { href: 'auditoria.html', icono: '🕵️', texto: 'Auditoría' },
    { href: 'configuracion-seguridad.html', icono: '🔒', texto: 'Seguridad' },
  ]},
];

const NAV_OPERADOR = [
  { grupo: 'Panel', items: [
    { href: 'dashboard.html', icono: '📊', texto: 'Dashboard' },
  ]},
  { grupo: 'Operación diaria', items: [
    { href: 'rutas.html', icono: '🧭', texto: 'Mis rutas' },
    { href: 'registro-recoleccion.html', icono: '✅', texto: 'Registrar recolección' },
    { href: 'incidencias.html', icono: '🚨', texto: 'Reportar incidencia' },
    { href: 'seguimiento-gps.html', icono: '📍', texto: 'Seguimiento GPS' },
  ]},
  { grupo: 'Configuración', items: [
    { href: 'perfil.html', icono: '👤', texto: 'Mi perfil' },
    { href: 'configuracion-gps.html', icono: '⚙️', texto: 'Configuración GPS' },
  ]},
];

const NAV_CIUDADANO = [
  { href: 'dashboard.html', texto: 'Dashboard' },
  { href: 'horarios.html', texto: 'Horarios' },
  { href: 'seguimiento-gps.html', texto: 'Seguimiento GPS' },
  { href: 'incidencias.html', texto: 'Reportar incidencia' },
  { href: 'historial-incidencias.html', texto: 'Mis incidencias' },
  { href: 'notificaciones.html', texto: 'Notificaciones' },
];

function nombreArchivoActual() {
  const partes = window.location.pathname.split('/');
  return partes[partes.length - 1] || 'dashboard.html';
}

/**
 * Prefijo relativo hacia frontend/assets/ según la profundidad de la página
 * actual (público/index.html vs público/admin|ciudadano|operador/*.html).
 */
function prefijoAssets() {
  return /\/(admin|ciudadano|operador)\//.test(window.location.pathname) ? '../../assets' : '../assets';
}

function iniciales(usuario) {
  const n = (usuario.nombres || '').trim()[0] || '';
  const a = (usuario.apellidos || '').trim()[0] || '';
  return (n + a).toUpperCase() || 'EW';
}

/**
 * Construye el sidebar de administrador u operador dentro del contenedor con id="sidebar".
 * @param {'admin'|'operador'} rol
 */
function construirSidebar(rol, sesion) {
  const contenedor = document.getElementById('sidebar');
  if (!contenedor) return;

  const grupos = rol === 'admin' ? NAV_ADMIN : NAV_OPERADOR;
  const actual = nombreArchivoActual();
  const tituloRol = rol === 'admin' ? 'Panel Administrativo' : 'Panel de Operador';

  let navHtml = '';
  grupos.forEach((grupo) => {
    navHtml += `<div class="sidebar-section-title">${grupo.grupo}</div><ul class="sidebar-nav">`;
    grupo.items.forEach((item) => {
      const activo = item.href === actual ? 'active' : '';
      navHtml += `<li><a href="${item.href}" class="${activo}"><span class="icon">${item.icono}</span> ${item.texto}</a></li>`;
    });
    navHtml += '</ul>';
  });

  contenedor.innerHTML = `
    <div class="sidebar-brand">
      <img src="${prefijoAssets()}/logos/Logo_solo_hoja.png" alt="EcoRutas Wanchaq" class="brand-logo">
      <div class="sidebar-brand-text">
        <strong>EcoRutas Wanchaq</strong>
        <span>${tituloRol}</span>
      </div>
    </div>
    ${navHtml}
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="avatar">${iniciales(sesion.usuario)}</div>
        <div class="sidebar-user-info">
          <strong>${sesion.usuario.nombres} ${sesion.usuario.apellidos}</strong>
          <span>${sesion.usuario.cargo || (rol === 'admin' ? 'Administrador' : 'Operador')}</span>
        </div>
      </div>
      <button class="btn btn-ghost btn-block btn-sm" id="btnCerrarSesion">🚪 Cerrar sesión</button>
    </div>
  `;

  const btnSalir = document.getElementById('btnCerrarSesion');
  if (btnSalir) btnSalir.addEventListener('click', cerrarSesion);
}

/**
 * Construye la navbar superior de ciudadano dentro del contenedor con id="navbar-ciudadano".
 */
function construirNavbarCiudadano(sesion) {
  const contenedor = document.getElementById('navbar-ciudadano');
  if (!contenedor) return;

  const actual = nombreArchivoActual();
  let linksHtml = '';
  NAV_CIUDADANO.forEach((item) => {
    const activo = item.href === actual ? 'active' : '';
    linksHtml += `<li><a href="${item.href}" class="${activo}">${item.texto}</a></li>`;
  });

  contenedor.innerHTML = `
    <div class="navbar-inner">
      <a href="dashboard.html" class="navbar-brand" style="text-decoration:none;">
        <img src="${prefijoAssets()}/logos/Logo_solo_hoja.png" alt="EcoRutas Wanchaq" class="brand-logo">
        <div class="navbar-brand-text">
          <strong>EcoRutas Wanchaq</strong>
          <span>Municipalidad Distrital de Wanchaq</span>
        </div>
      </a>
      <button class="navbar-toggle" id="btnNavToggle" aria-label="Abrir menú">☰</button>
      <ul class="navbar-links" id="navbarLinks">${linksHtml}</ul>
      <div class="navbar-actions">
        <a href="perfil.html" class="navbar-user">
          <div class="avatar" style="width:28px;height:28px;font-size:0.7rem;">${iniciales(sesion.usuario)}</div>
          <span class="navbar-user-name">${sesion.usuario.nombres}</span>
        </a>
        <button class="btn btn-outline btn-sm" id="btnCerrarSesion" style="border-color:rgba(255,255,255,0.4); color:#fff;">Salir</button>
      </div>
    </div>
  `;

  document.getElementById('btnCerrarSesion').addEventListener('click', cerrarSesion);
  const toggle = document.getElementById('btnNavToggle');
  const links = document.getElementById('navbarLinks');
  if (toggle) {
    toggle.addEventListener('click', () => {
      links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
    });
  }
}

/**
 * Devuelve el HTML del footer institucional. Debe insertarse en un
 * contenedor con id="footer-institucional" en cada página.
 */
function footerInstitucionalHTML() {
  return `
    <div class="footer-inner">
      <div class="footer-col">
        <div class="footer-brand">
          <img src="${prefijoAssets()}/logos/Logo_solo_hoja.png" alt="EcoRutas Wanchaq" class="brand-logo">
          <div>
            <strong style="color:#fff; display:block;">EcoRutas Wanchaq</strong>
            <span style="font-size:0.8rem;">Sistema de Gestión Inteligente de Residuos Sólidos</span>
          </div>
        </div>
        <p>Un servicio de la Municipalidad Distrital de Wanchaq para la mejora continua de la limpieza pública y el cuidado ambiental del distrito.</p>
      </div>
      <div class="footer-col">
        <div class="footer-title">Gerencia de Gestión Ambiental</div>
        <ul>
          <li>📍 Av. Los Incas 500, Wanchaq, Cusco</li>
          <li>📞 (084) 234 567 — Anexo 105</li>
          <li>✉️ gestionambiental@munwanchaq.gob.pe</li>
          <li>🕗 Lun. a Vie. de 07:30 a 16:00 h</li>
        </ul>
      </div>
      <div class="footer-col">
        <div class="footer-title">Enlaces</div>
        <ul>
          <li><a href="#">Preguntas frecuentes</a></li>
          <li><a href="#">Términos y condiciones</a></li>
          <li><a href="#">Política de privacidad</a></li>
          <li><a href="#">Libro de reclamaciones</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} Municipalidad Distrital de Wanchaq — Gerencia de Gestión Ambiental. Todos los derechos reservados.</span>
      <span>Proyecto EcoRutas Wanchaq — Fase 1 (Interfaz de demostración)</span>
    </div>
  `;
}

function insertarFooterInstitucional() {
  const contenedor = document.getElementById('footer-institucional');
  if (contenedor) contenedor.innerHTML = footerInstitucionalHTML();
}

/* ---------------------------------------------------------------------- */
/* Helpers varios                                                          */
/* ---------------------------------------------------------------------- */

function formatearFecha(fechaIso) {
  const fecha = new Date(fechaIso);
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatearFechaHora(fechaIso) {
  const fecha = new Date(fechaIso);
  return fecha.toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function badgeEstadoIncidencia(estado) {
  const mapa = {
    pendiente: { clase: 'badge-warning', texto: 'Pendiente' },
    en_atencion: { clase: 'badge-info', texto: 'En atención' },
    resuelta: { clase: 'badge-success', texto: 'Resuelta' },
  };
  const item = mapa[estado] || { clase: 'badge-neutral', texto: estado };
  return `<span class="badge ${item.clase}">${item.texto}</span>`;
}

function badgeEstadoRuta(estado) {
  const mapa = {
    pendiente: { clase: 'badge-neutral', texto: 'Pendiente' },
    en_progreso: { clase: 'badge-info', texto: 'En progreso' },
    completada: { clase: 'badge-success', texto: 'Completada' },
  };
  const item = mapa[estado] || { clase: 'badge-neutral', texto: estado };
  return `<span class="badge ${item.clase}">${item.texto}</span>`;
}

/**
 * Activa el botón hamburguesa del topbar para abrir/cerrar el sidebar en móvil.
 */
function activarSidebarToggle() {
  const btn = document.getElementById('btnSidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!btn || !sidebar) return;

  function alternar() {
    sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('show');
  }
  btn.addEventListener('click', alternar);
  if (backdrop) backdrop.addEventListener('click', alternar);
}

/**
 * Renderiza controles de paginación genéricos dentro de un contenedor.
 * @param {HTMLElement} contenedor
 * @param {number} totalItems
 * @param {number} porPagina
 * @param {number} paginaActual (1-indexed)
 * @param {(pagina:number)=>void} onCambiarPagina
 */
function renderPaginacion(contenedor, totalItems, porPagina, paginaActual, onCambiarPagina) {
  const totalPaginas = Math.max(Math.ceil(totalItems / porPagina), 1);
  if (totalPaginas <= 1) { contenedor.innerHTML = ''; return; }

  let html = `<button data-pagina="${paginaActual - 1}" ${paginaActual === 1 ? 'disabled' : ''}>&laquo;</button>`;
  for (let i = 1; i <= totalPaginas; i++) {
    html += `<button data-pagina="${i}" class="${i === paginaActual ? 'active' : ''}">${i}</button>`;
  }
  html += `<button data-pagina="${paginaActual + 1}" ${paginaActual === totalPaginas ? 'disabled' : ''}>&raquo;</button>`;
  contenedor.innerHTML = html;

  contenedor.querySelectorAll('button[data-pagina]').forEach((btn) => {
    btn.addEventListener('click', () => onCambiarPagina(Number(btn.dataset.pagina)));
  });
}

window.renderPaginacion = renderPaginacion;
window.activarSidebarToggle = activarSidebarToggle;
window.mostrarToast = mostrarToast;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.construirSidebar = construirSidebar;
window.construirNavbarCiudadano = construirNavbarCiudadano;
window.footerInstitucionalHTML = footerInstitucionalHTML;
window.insertarFooterInstitucional = insertarFooterInstitucional;
window.formatearFecha = formatearFecha;
window.formatearFechaHora = formatearFechaHora;
window.badgeEstadoIncidencia = badgeEstadoIncidencia;
window.badgeEstadoRuta = badgeEstadoRuta;

/* ---------------------------------------------------------------------- */
/* GPS — distancia en línea recta, ETA simple y "hace cuánto" (Fase 3)     */
/* ---------------------------------------------------------------------- */

/**
 * Distancia en línea recta entre dos coordenadas (fórmula de Haversine), en km.
 * No usa ningún servicio de rutas ni de mapas de pago.
 */
function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // radio de la Tierra en km
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * ETA simple en minutos a partir de una distancia (km) y una velocidad (km/h).
 * Si no hay velocidad reportada (camión detenido o dato no disponible), usa
 * una velocidad urbana promedio conservadora de 20 km/h.
 */
function calcularEtaMinutos(distanciaKm, velocidadKmh) {
  const velocidad = velocidadKmh && velocidadKmh > 3 ? velocidadKmh : 20;
  return Math.max(Math.round((distanciaKm / velocidad) * 60), 1);
}

/**
 * Texto relativo tipo "hace 12 segundos" / "hace 3 minutos" a partir de un ISO.
 */
function tiempoRelativo(fechaIso) {
  const segundos = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 1000);
  if (segundos < 5) return 'justo ahora';
  if (segundos < 60) return `hace ${segundos} segundos`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} minuto${minutos === 1 ? '' : 's'}`;
  const horas = Math.floor(minutos / 60);
  return `hace ${horas} hora${horas === 1 ? '' : 's'}`;
}

window.calcularDistanciaKm = calcularDistanciaKm;
window.calcularEtaMinutos = calcularEtaMinutos;
window.tiempoRelativo = tiempoRelativo;
