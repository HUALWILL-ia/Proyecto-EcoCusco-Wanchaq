/**
 * pages/ciudadano-seguimiento-gps.js — Mapa de seguimiento GPS en tiempo real (Fase 3)
 * Usa Leaflet.js para el mapa y Socket.IO para recibir la posición real de
 * CUALQUIER camión con ruta activa (no solo el de la zona del ciudadano),
 * apenas el operador la transmite desde su celular (sin polling). El camión
 * de la propia zona del ciudadano se resalta frente a los demás.
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['ciudadano']);
  if (!sesion) return;

  construirNavbarCiudadano(sesion);
  insertarFooterInstitucional();

  const UMBRAL_SENAL_PERDIDA_MS = 2 * 60 * 1000; // 2 minutos

  (async () => {
    let usuario, miZona, todasZonas = [], miPosicion = null, activos = [];
    try {
      ({ usuario } = await obtenerMiPerfil());
      miZona = await getZonaPorNombre(usuario.zona);
      todasZonas = await obtenerZonas();
      activos = await obtenerGPSActivos();
    } catch (err) {
      mostrarToast('error', 'No se pudo cargar la información del mapa', err.message);
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

    const centroInicial = activos[0] ? [activos[0].lat, activos[0].lng] : [-13.5292, -71.9550];
    const mapa = L.map('mapaGps').setView(centroInicial, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(mapa);

    const { leyenda } = dibujarPoligonosZonas(mapa, todasZonas, { zonaDestacadaId: miZona ? miZona.id : null });
    renderLeyendaZonas(document.getElementById('leyendaZonas'), leyenda);

    if (miPosicion) {
      L.marker([miPosicion.lat, miPosicion.lng], {
        icon: L.divIcon({ html: '🏠', className: 'icono-camion-mapa', iconSize: [26, 26] }),
      }).addTo(mapa).bindPopup('Tu ubicación aproximada');
    }

    // Leyenda del mapa (esquina inferior izquierda): qué representa cada
    // elemento — zona, línea de ruta, punto de recojo y camión en movimiento.
    const leyendaControl = L.control({ position: 'bottomleft' });
    leyendaControl.onAdd = function () {
      const div = L.DomUtil.create('div', 'leyenda-mapa-gps');
      div.innerHTML = `
        <div><span class="leyenda-muestra-zona"></span>Zona</div>
        <div><span class="leyenda-muestra-linea"></span>Línea de ruta</div>
        <div><span>📍</span>Punto de recojo</div>
        <div><span>🚛</span>Camión en movimiento</div>
      `;
      return div;
    };
    leyendaControl.addTo(mapa);

    // Un marcador por camión activo, indexado por camionId (camionId -> { marcador, ubicacion }).
    const marcadores = new Map();

    function esDeMiZona(ubicacion) {
      return miZona != null && ubicacion.zonaId != null && String(ubicacion.zonaId) === String(miZona.id);
    }

    function iconoPara(ubicacion) {
      const destacado = esDeMiZona(ubicacion);
      return L.divIcon({
        html: '🚛',
        className: destacado ? 'icono-camion-mapa icono-camion-destacado' : 'icono-camion-mapa',
        iconSize: destacado ? [42, 42] : [26, 26],
      });
    }

    function popupPara(ubicacion) {
      return `
        <strong>${ubicacion.placa || 'Camión'}</strong>${esDeMiZona(ubicacion) ? ' <span class="badge badge-success">Tu zona</span>' : ''}<br>
        Zona: ${ubicacion.zonaNombre || 'Sin asignar'}<br>
        Velocidad: ${ubicacion.velocidad !== null && ubicacion.velocidad !== undefined ? `${ubicacion.velocidad} km/h` : 'No disponible'}<br>
        Última actualización: ${tiempoRelativo(ubicacion.fecha)}
      `;
    }

    function upsertMarcador(ubicacion) {
      if (!ubicacion || !ubicacion.camionId) return;
      const existente = marcadores.get(ubicacion.camionId);
      if (existente) {
        existente.ubicacion = ubicacion;
        existente.marcador.setLatLng([ubicacion.lat, ubicacion.lng]);
        existente.marcador.setIcon(iconoPara(ubicacion));
        existente.marcador.setPopupContent(popupPara(ubicacion));
      } else {
        const marcador = L.marker([ubicacion.lat, ubicacion.lng], { icon: iconoPara(ubicacion) })
          .addTo(mapa)
          .bindPopup(popupPara(ubicacion));
        // Al tocar un camión, su ruta pasa a ser la "seleccionada": solo esa
        // muestra trazado + puntos de recojo (evita saturar el mapa con las
        // líneas de todas las rutas activas a la vez).
        marcador.on('click', () => {
          rutaSeleccionadaId = ubicacion.rutaId;
          actualizarCapaRutaSeleccionada();
        });
        marcadores.set(ubicacion.camionId, { marcador, ubicacion });
      }
      if (esDeMiZona(ubicacion)) renderInfoMiZona(ubicacion);
      actualizarCapaRutaSeleccionada();
    }

    // Trazado (calles) + puntos de recojo: solo de la ruta seleccionada por el
    // ciudadano (clic en un camión) o, por defecto, la de su propia zona.
    // Vive en su propio layer group para poder limpiarla y redibujar solo esa
    // ruta al cambiar la selección, sin tocar los marcadores de camión.
    let rutaSeleccionadaId = null;
    let rutaDibujadaId = null;
    const capaRutaSeleccionada = L.layerGroup().addTo(mapa);

    function rutaEfectivaId() {
      if (rutaSeleccionadaId) return rutaSeleccionadaId;
      const propia = ubicacionMiZona();
      return propia ? propia.rutaId : null;
    }

    async function actualizarCapaRutaSeleccionada() {
      const id = rutaEfectivaId();
      if (id === rutaDibujadaId) return; // ya está dibujada, nada que hacer
      rutaDibujadaId = id;
      capaRutaSeleccionada.clearLayers();
      if (!id) return;
      try {
        const ruta = await obtenerRutaPorId(id);
        if (ruta) dibujarTrazadoRuta(capaRutaSeleccionada, ruta);
      } catch (err) {
        // El mapa sigue siendo útil sin el trazado/puntos si esta consulta falla.
      }
    }

    activos.forEach(upsertMarcador);
    if (activos.length > 0) {
      const grupo = L.featureGroup(Array.from(marcadores.values(), (m) => m.marcador));
      mapa.fitBounds(grupo.getBounds().pad(0.3));
    }

    renderInfoMiZona();

    // --- Tiempo real vía Socket.IO ---
    if (typeof io === 'function') {
      const socket = io(API_BASE_URL.replace(/\/api\/?$/, ''));
      socket.on('connect', () => socket.emit('gps:suscribir', { todas: true }));
      socket.on('gps:actualizacion', (ubicacion) => upsertMarcador(ubicacion));
    }

    // Revisa cada 15s si la señal de "mi zona" quedó desactualizada (sin depender de nuevos eventos).
    setInterval(() => renderInfoMiZona(), 15000);

    function ubicacionMiZona() {
      if (!miZona) return null;
      for (const { ubicacion } of marcadores.values()) {
        if (esDeMiZona(ubicacion)) return ubicacion;
      }
      return null;
    }

    function renderInfoMiZona(ubicacionForzada) {
      const contenedor = document.getElementById('infoCamion');
      const avisoSenal = document.getElementById('avisoSenal');
      const ultimaUbicacion = ubicacionForzada || ubicacionMiZona();

      if (!miZona) {
        contenedor.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📍</div><h3>Sin zona registrada</h3><p>Tu cuenta no tiene una zona de residencia asignada.</p></div>`;
        avisoSenal.style.display = 'none';
        return;
      }

      if (!ultimaUbicacion) {
        contenedor.innerHTML = `
          <div class="card-header"><h3 class="mb-0">Tu zona: ${miZona.nombre}</h3></div>
          <div class="empty-state">
            <div class="empty-state-icon">📡</div>
            <h3>Sin camión transmitiendo en tu zona</h3>
            <p>Ningún operador de tu zona está transmitiendo su ubicación en este momento. En el mapa puedes ver los demás camiones activos de otras zonas.</p>
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
        <div class="card-header"><h3 class="mb-0">${ultimaUbicacion.placa || 'Camión'}</h3>${badgeEstadoCamion(ultimaUbicacion.camionEstado)}</div>
        ${ultimaUbicacion.modelo ? `<p><strong>Modelo:</strong> ${ultimaUbicacion.modelo}</p>` : ''}
        <p><strong>Zona:</strong> ${miZona.nombre}</p>
        <p><strong>Velocidad aproximada:</strong> ${ultimaUbicacion.velocidad !== null && ultimaUbicacion.velocidad !== undefined ? `${ultimaUbicacion.velocidad} km/h` : 'No disponible'}</p>
        ${etaHtml}
        <span class="badge ${senalPerdida ? 'badge-warning' : 'badge-success'}">${senalPerdida ? 'Señal no disponible' : 'En vivo'}</span>
        <p class="text-muted mt-2 mb-0">Última actualización: ${tiempoRelativo(ultimaUbicacion.fecha)}</p>
      `;
    }

    function badgeEstadoCamion(estado) {
      if (!estado) return '';
      return estado === 'operativo'
        ? '<span class="badge badge-success">Operativo</span>'
        : '<span class="badge badge-warning">En mantenimiento</span>';
    }
  })();
})();
