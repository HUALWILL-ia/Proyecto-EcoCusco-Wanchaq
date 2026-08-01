/**
 * pages/operador-seguimiento-gps.js — Seguimiento GPS REAL del operador (Fase 3)
 * Usa la geolocalización real del navegador (navigator.geolocation.watchPosition)
 * y transmite la posición al backend, que la guarda en ubicaciones_gps y la
 * difunde en tiempo real por Socket.IO a quien esté viendo esa ruta.
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['operador']);
  if (!sesion) return;

  construirSidebar('operador', sesion);
  activarSidebarToggle();

  const claveConfig = 'ecoRutasWanchaq_config_gps_' + sesion.usuario.id;
  const configGps = Storage.get(claveConfig, { intervaloSeg: 10, compartir: true, precision: 'alta' });

  const badgeEstado = document.getElementById('badgeEstadoGps');
  const tarjetaPermiso = document.getElementById('permisoGpsCard');
  const contenedorInfo = document.getElementById('infoGpsOperador');

  let mapa = null;
  let marcador = null;
  let camion = null;
  let rutaActivaId = null;
  let ultimoEnvio = 0;
  let watchId = null;

  (async () => {
    try {
      camion = await obtenerMiCamion();
      const rutas = await obtenerRutasPorOperador();
      const rutaActiva = rutas.find((r) => r.estado === 'en_progreso') || rutas[0] || null;
      rutaActivaId = rutaActiva ? rutaActiva.id : null;
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar tu camión/ruta', err.message);
    }

    inicializarMapa();

    if (!camion) {
      contenedorInfo.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚛</div><h3>Sin camión asignado</h3></div>`;
      return;
    }
    if (!rutaActivaId) {
      contenedorInfo.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🧭</div><h3>Sin ruta activa</h3><p>No se puede transmitir GPS sin una ruta asignada.</p></div>`;
      return;
    }

    if (!('geolocation' in navigator)) {
      contenedorInfo.innerHTML = `<div class="empty-state"><h3>Tu navegador no soporta geolocalización</h3></div>`;
      return;
    }

    if (!configGps.compartir) {
      renderTransmisionPausada();
      return;
    }

    mostrarBotonActivar();
  })();

  async function inicializarMapa() {
    const centro = camion?.ubicacionActual?.lat
      ? [camion.ubicacionActual.lat, camion.ubicacionActual.lng]
      : [-13.5292, -71.9550];
    mapa = L.map('mapaGpsOperador').setView(centro, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(mapa);

    try {
      const zonas = await obtenerZonas();
      const { leyenda } = dibujarPoligonosZonas(mapa, zonas, { zonaDestacadaId: camion ? camion.zonaAsignada : null });
      renderLeyendaZonas(document.getElementById('leyendaZonas'), leyenda);
    } catch (err) {
      // El mapa sigue siendo útil sin los polígonos si la carga de zonas falla.
    }

    const icono = L.divIcon({ html: '🚛', className: 'icono-camion-mapa', iconSize: [32, 32] });
    marcador = L.marker(centro, { icon: icono }).addTo(mapa);
    if (camion) marcador.bindPopup(`<strong>${camion.placa}</strong>`);
  }

  function mostrarBotonActivar() {
    tarjetaPermiso.style.display = '';
    contenedorInfo.innerHTML = `<div class="empty-state"><h3>GPS en espera</h3><p>Pulsa "Activar GPS" para empezar a transmitir tu ubicación real.</p></div>`;
    document.getElementById('btnActivarGps').addEventListener('click', activarGeolocalizacion, { once: true });
  }

  function activarGeolocalizacion() {
    tarjetaPermiso.style.display = 'none';
    contenedorInfo.innerHTML = `<div class="loading-overlay"><span class="spinner"></span> Solicitando permiso de ubicación...</div>`;

    watchId = navigator.geolocation.watchPosition(
      manejarNuevaPosicion,
      manejarErrorGeolocalizacion,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  async function manejarNuevaPosicion(posicion) {
    const { latitude: lat, longitude: lng, speed } = posicion.coords;
    const velocidadKmh = speed !== null && speed !== undefined ? Math.round(speed * 3.6 * 10) / 10 : null;

    badgeEstado.textContent = 'Transmitiendo';
    badgeEstado.className = 'badge badge-success';

    if (marcador) marcador.setLatLng([lat, lng]);
    if (mapa) mapa.panTo([lat, lng]);

    renderInfo({ lat, lng, velocidad: velocidadKmh, fecha: new Date().toISOString(), enviando: false });

    const ahora = Date.now();
    const intervaloMs = (configGps.intervaloSeg || 10) * 1000;
    if (ahora - ultimoEnvio < intervaloMs) return; // limita el envío real al backend (no cada evento del GPS)
    ultimoEnvio = ahora;

    try {
      await actualizarGPS(lat, lng, { velocidad: velocidadKmh, rutaId: rutaActivaId });
    } catch (err) {
      mostrarToast('error', 'No se pudo transmitir tu ubicación', err.message);
    }
  }

  function manejarErrorGeolocalizacion(error) {
    badgeEstado.textContent = 'Sin permiso';
    badgeEstado.className = 'badge badge-danger';

    const mensajes = {
      1: 'Denegaste el permiso de ubicación. Actívalo desde la configuración del navegador/celular para poder transmitir tu posición.',
      2: 'No se pudo determinar tu ubicación (señal GPS no disponible). Intenta salir a un espacio abierto.',
      3: 'La solicitud de ubicación tardó demasiado. Verifica tu señal GPS e inténtalo de nuevo.',
    };

    contenedorInfo.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📍</div><h3>No se pudo activar el GPS</h3><p>${mensajes[error.code] || error.message}</p></div>`;
    tarjetaPermiso.style.display = '';
    document.getElementById('btnActivarGps').addEventListener('click', activarGeolocalizacion, { once: true });
  }

  function renderTransmisionPausada() {
    badgeEstado.textContent = 'Pausado';
    badgeEstado.className = 'badge badge-neutral';
    contenedorInfo.innerHTML = `<div class="empty-state"><h3>Transmisión pausada</h3><p>Actívala en <a href="configuracion-gps.html">Configuración GPS</a>.</p></div>`;
  }

  function renderInfo({ lat, lng, velocidad, fecha }) {
    contenedorInfo.innerHTML = `
      <p><strong>Camión:</strong> ${camion.placa}</p>
      <p><strong>Latitud:</strong> ${lat.toFixed(5)}</p>
      <p><strong>Longitud:</strong> ${lng.toFixed(5)}</p>
      <p><strong>Velocidad aproximada:</strong> ${velocidad !== null ? `${velocidad} km/h` : 'No disponible'}</p>
      <span class="badge badge-success">Transmitiendo ubicación real</span>
      <p class="text-muted mt-2 mb-0">Última lectura: ${formatearFechaHora(fecha)} · envío cada ${configGps.intervaloSeg}s</p>
    `;
  }

  window.addEventListener('beforeunload', () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  });
})();
