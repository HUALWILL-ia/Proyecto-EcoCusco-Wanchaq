/**
 * pages/ciudadano-seguimiento-gps.js — Mapa de seguimiento GPS en tiempo real (Fase 3)
 * Usa Leaflet.js para el mapa y Socket.IO para recibir la posición real del
 * camión apenas el operador la transmite desde su celular (sin polling).
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['ciudadano']);
  if (!sesion) return;

  construirNavbarCiudadano(sesion);
  insertarFooterInstitucional();

  const UMBRAL_SENAL_PERDIDA_MS = 2 * 60 * 1000; // 2 minutos

  (async () => {
    let usuario, miZona, camion, todasZonas = [], miPosicion = null;
    try {
      ({ usuario } = await obtenerMiPerfil());
      miZona = await getZonaPorNombre(usuario.zona);
      const camiones = await obtenerCamiones();
      camion = miZona ? camiones.find((c) => c.zonaAsignada === miZona.id) : camiones[0];
      todasZonas = await obtenerZonas();
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar la información del mapa', err.message);
      return;
    }

    if (!camion) {
      document.getElementById('infoCamion').innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚛</div><h3>Sin camión asignado</h3><p>Tu zona aún no tiene un vehículo asignado en este momento.</p></div>`;
      return;
    }

    // Ubicación aproximada del propio ciudadano (opcional, solo para el ETA).
    // Si el permiso se rechaza, simplemente no se muestra el ETA — no bloquea el resto del mapa.
    try {
      miPosicion = await new Promise((resolve) => {
        if (!('geolocation' in navigator)) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { maximumAge: 60000, timeout: 5000 }
        );
      });
    } catch (_) {
      miPosicion = null;
    }

    const centro = camion.ubicacionActual.lat ? [camion.ubicacionActual.lat, camion.ubicacionActual.lng] : [-13.5292, -71.9550];
    const mapa = L.map('mapaGps').setView(centro, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(mapa);

    const { leyenda } = dibujarPoligonosZonas(mapa, todasZonas, { zonaDestacadaId: miZona ? miZona.id : null });
    renderLeyendaZonas(document.getElementById('leyendaZonas'), leyenda);

    const iconoCamion = L.divIcon({ html: '🚛', className: 'icono-camion-mapa', iconSize: [32, 32] });
    const marcador = L.marker(centro, { icon: iconoCamion }).addTo(mapa)
      .bindPopup(`<strong>${camion.placa}</strong><br>${camion.modelo}`);

    let marcadorCiudadano = null;
    if (miPosicion) {
      marcadorCiudadano = L.marker([miPosicion.lat, miPosicion.lng], {
        icon: L.divIcon({ html: '🏠', className: 'icono-camion-mapa', iconSize: [26, 26] }),
      }).addTo(mapa).bindPopup('Tu ubicación aproximada');
    }

    let ultimaUbicacion = null;

    // Posición inicial conocida (antes de que llegue cualquier evento en vivo).
    try {
      const inicial = await obtenerGPSPorCamion(camion.id);
      if (inicial) {
        ultimaUbicacion = inicial;
        marcador.setLatLng([inicial.lat, inicial.lng]);
        mapa.panTo([inicial.lat, inicial.lng]);
      }
    } catch (err) {
      // Sin ubicación inicial todavía: se queda con la referencia estática del camión.
    }

    renderInfo();

    // --- Tiempo real vía Socket.IO ---
    if (typeof io === 'function') {
      const socket = io(API_BASE_URL.replace(/\/api\/?$/, ''));
      socket.on('connect', () => socket.emit('gps:suscribir', { camionId: camion.id }));
      socket.on('gps:actualizacion', (ubicacion) => {
        ultimaUbicacion = ubicacion;
        marcador.setLatLng([ubicacion.lat, ubicacion.lng]);
        mapa.panTo([ubicacion.lat, ubicacion.lng]);
        renderInfo();
      });
    }

    // Revisa cada 15s si la señal quedó desactualizada (sin depender de nuevos eventos).
    setInterval(renderInfo, 15000);

    function renderInfo() {
      const contenedor = document.getElementById('infoCamion');
      const avisoSenal = document.getElementById('avisoSenal');

      if (!ultimaUbicacion) {
        contenedor.innerHTML = `
          <div class="card-header"><h3 class="mb-0">${camion.placa}</h3>${badgeEstadoCamion(camion.estado)}</div>
          <p><strong>Modelo:</strong> ${camion.modelo}</p>
          <div class="empty-state">
            <div class="empty-state-icon">📡</div>
            <h3>Aún sin transmisión</h3>
            <p>El operador todavía no ha transmitido su ubicación real hoy.</p>
          </div>
        `;
        avisoSenal.style.display = 'none';
        return;
      }

      const segundosDesdeUltima = Date.now() - new Date(ultimaUbicacion.fecha).getTime();
      const senalPerdida = segundosDesdeUltima > UMBRAL_SENAL_PERDIDA_MS;
      avisoSenal.style.display = senalPerdida ? '' : 'none';

      let etaHtml = '';
      if (miPosicion) {
        const distanciaKm = calcularDistanciaKm(miPosicion.lat, miPosicion.lng, ultimaUbicacion.lat, ultimaUbicacion.lng);
        const etaMin = calcularEtaMinutos(distanciaKm, ultimaUbicacion.velocidad);
        etaHtml = `
          <p><strong>Distancia aproximada:</strong> ${distanciaKm.toFixed(2)} km</p>
          <p><strong>Tiempo estimado de llegada:</strong> ${senalPerdida ? 'No disponible' : `~${etaMin} min`}</p>
        `;
      }

      contenedor.innerHTML = `
        <div class="card-header"><h3 class="mb-0">${ultimaUbicacion.placa || camion.placa}</h3>${badgeEstadoCamion(camion.estado)}</div>
        <p><strong>Modelo:</strong> ${camion.modelo}</p>
        <p><strong>Zona:</strong> ${miZona ? miZona.nombre : '—'}</p>
        <p><strong>Velocidad aproximada:</strong> ${ultimaUbicacion.velocidad !== null && ultimaUbicacion.velocidad !== undefined ? `${ultimaUbicacion.velocidad} km/h` : 'No disponible'}</p>
        ${etaHtml}
        <span class="badge ${senalPerdida ? 'badge-warning' : 'badge-success'}">${senalPerdida ? 'Señal no disponible' : 'En vivo'}</span>
        <p class="text-muted mt-2 mb-0">Última actualización: ${tiempoRelativo(ultimaUbicacion.fecha)}</p>
      `;
    }

    function badgeEstadoCamion(estado) {
      return estado === 'operativo'
        ? '<span class="badge badge-success">Operativo</span>'
        : '<span class="badge badge-warning">En mantenimiento</span>';
    }
  })();
})();
