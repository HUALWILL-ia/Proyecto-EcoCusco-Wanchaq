/**
 * pages/admin-camiones.js — Gestión de la flota de camiones (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  const selectZona = document.getElementById('zonaAsignadaCamion');
  let todosCamiones = [];
  let todasZonas = [];
  let todosUsuarios = [];

  function nombreOperadorDe(camionId) {
    const operador = todosUsuarios.find((u) => u.rol === 'operador' && u.camionAsignado === camionId);
    return operador ? `${operador.nombres} ${operador.apellidos}` : '—';
  }

  function render() {
    const tbody = document.getElementById('tablaCamiones');

    if (todosCamiones.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><h3>Sin camiones registrados</h3></div></td></tr>`;
      return;
    }

    tbody.innerHTML = todosCamiones.map((c) => {
      const zona = todasZonas.find((z) => z.id === c.zonaAsignada);
      const estadoBadge = c.estado === 'operativo'
        ? '<span class="badge badge-success">Operativo</span>'
        : '<span class="badge badge-warning">Mantenimiento</span>';
      return `
        <tr>
          <td><strong>${c.placa}</strong></td>
          <td>${c.modelo}</td>
          <td>${c.capacidadKg} kg</td>
          <td>${zona ? zona.nombre : '—'}</td>
          <td>${nombreOperadorDe(c.id)}</td>
          <td>${estadoBadge}</td>
          <td>${c.nivelCombustible}%</td>
          <td>
            <button class="btn btn-outline btn-sm" data-accion="gps" data-id="${c.id}">📍 GPS</button>
            <button class="btn btn-outline btn-sm" data-accion="editar" data-id="${c.id}">Editar</button>
            <button class="btn btn-danger btn-sm" data-accion="eliminar" data-id="${c.id}">Eliminar</button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-accion="editar"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirEdicion(btn.dataset.id));
    });
    tbody.querySelectorAll('[data-accion="eliminar"]').forEach((btn) => {
      btn.addEventListener('click', () => eliminar(btn.dataset.id));
    });
    tbody.querySelectorAll('[data-accion="gps"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirGpsCamion(btn.dataset.id));
    });
  }

  // --- Seguimiento GPS en vivo (Socket.IO) ---
  let mapaGps = null;
  let marcadorGps = null;
  let socketGps = null;

  function abrirGpsCamion(id) {
    const camion = todosCamiones.find((c) => String(c.id) === String(id));
    if (!camion) return;

    document.getElementById('tituloModalGps').textContent = `Seguimiento GPS — ${camion.placa}`;
    abrirModal('modalGpsCamion');

    // Por si el modal se cerró antes haciendo clic fuera (sin pasar por cerrarModalGps):
    if (socketGps) { socketGps.disconnect(); socketGps = null; }
    if (mapaGps) { mapaGps.remove(); mapaGps = null; marcadorGps = null; }

    setTimeout(async () => {
      const centro = camion.ubicacionActual?.lat ? [camion.ubicacionActual.lat, camion.ubicacionActual.lng] : [-13.5292, -71.955];
      mapaGps = L.map('mapaGpsCamion').setView(centro, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 18 }).addTo(mapaGps);
      marcadorGps = L.marker(centro, { icon: L.divIcon({ html: '🚛', className: 'icono-camion-mapa', iconSize: [32, 32] }) }).addTo(mapaGps);

      try {
        dibujarPoligonosZonas(mapaGps, todasZonas, { zonaDestacadaId: camion.zonaAsignada });
      } catch (err) {
        // El mapa sigue siendo útil sin los polígonos si el dibujo falla.
      }

      renderInfoGps(null, camion);

      obtenerGPSPorCamion(camion.id).then((ubicacion) => {
        if (ubicacion) {
          marcadorGps.setLatLng([ubicacion.lat, ubicacion.lng]);
          mapaGps.panTo([ubicacion.lat, ubicacion.lng]);
          renderInfoGps(ubicacion, camion);
        }
      }).catch(() => {});

      if (typeof io === 'function') {
        socketGps = io(API_BASE_URL.replace(/\/api\/?$/, ''));
        socketGps.on('connect', () => socketGps.emit('gps:suscribir', { camionId: camion.id }));
        socketGps.on('gps:actualizacion', (ubicacion) => {
          marcadorGps.setLatLng([ubicacion.lat, ubicacion.lng]);
          mapaGps.panTo([ubicacion.lat, ubicacion.lng]);
          renderInfoGps(ubicacion, camion);
        });
      }
    }, 50); // el modal debe estar visible antes de inicializar Leaflet (necesita medidas reales)
  }

  function renderInfoGps(ubicacion, camion) {
    const contenedor = document.getElementById('infoGpsCamion');
    if (!ubicacion) {
      contenedor.innerHTML = `<div class="empty-state"><h3>Sin transmisión aún</h3><p>El operador de ${camion.placa} no ha transmitido su ubicación real todavía.</p></div>`;
      return;
    }
    contenedor.innerHTML = `
      <p><strong>Velocidad:</strong> ${ubicacion.velocidad !== null && ubicacion.velocidad !== undefined ? `${ubicacion.velocidad} km/h` : 'No disponible'}</p>
      <p class="text-muted mb-0">Última actualización: ${tiempoRelativo(ubicacion.fecha)}</p>
    `;
  }

  window.cerrarModalGps = function cerrarModalGps() {
    cerrarModal('modalGpsCamion');
    if (socketGps) { socketGps.disconnect(); socketGps = null; }
    if (mapaGps) { mapaGps.remove(); mapaGps = null; marcadorGps = null; }
  };

  async function cargar() {
    const tbody = document.getElementById('tablaCamiones');
    tbody.innerHTML = `<tr><td colspan="8"><div class="loading-overlay"><span class="spinner"></span> Cargando flota...</div></td></tr>`;
    try {
      [todosCamiones, todasZonas, todosUsuarios] = await Promise.all([
        obtenerCamiones(),
        obtenerZonas(),
        getUsuarios(),
      ]);
      if (selectZona.options.length <= 1) {
        todasZonas.forEach((z) => {
          const opt = document.createElement('option');
          opt.value = z.id;
          opt.textContent = z.nombre;
          selectZona.appendChild(opt);
        });
      }
      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><h3>No se pudo cargar la flota</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  cargar();

  const form = document.getElementById('formCamion');
  const campos = { placa: document.getElementById('placa'), modelo: document.getElementById('modelo') };
  const errores = { placa: document.getElementById('errorPlaca'), modelo: document.getElementById('errorModelo') };

  document.getElementById('btnNuevoCamion').addEventListener('click', () => {
    form.reset();
    document.getElementById('camionId').value = '';
    document.getElementById('capacidadKg').value = 5000;
    document.getElementById('tituloModalCamion').textContent = 'Nuevo camión';
    abrirModal('modalCamion');
  });

  function abrirEdicion(id) {
    const camion = todosCamiones.find((c) => String(c.id) === String(id));
    if (!camion) return;
    document.getElementById('camionId').value = camion.id;
    campos.placa.value = camion.placa;
    campos.modelo.value = camion.modelo;
    document.getElementById('capacidadKg').value = camion.capacidadKg;
    document.getElementById('zonaAsignadaCamion').value = camion.zonaAsignada || '';
    document.getElementById('estadoCamion').value = camion.estado;
    document.getElementById('tituloModalCamion').textContent = `Editar ${camion.placa}`;
    abrirModal('modalCamion');
  }

  async function eliminar(id) {
    try {
      await eliminarCamion(id);
      await cargar();
      mostrarToast('success', 'Camión eliminado', 'El vehículo se eliminó de la flota.');
    } catch (err) {
      mostrarToast('error', 'No se pudo eliminar el camión', err.message);
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    Object.keys(campos).forEach((k) => {
      campos[k].classList.remove('is-invalid');
      errores[k].textContent = '';
      errores[k].classList.remove('show');
    });

    let valido = true;
    Object.keys(campos).forEach((k) => {
      const v = validarCampoObligatorio(campos[k].value);
      if (!v.valido) {
        campos[k].classList.add('is-invalid');
        errores[k].textContent = v.mensaje;
        errores[k].classList.add('show');
        valido = false;
      }
    });
    if (!valido) return;

    const idExistente = document.getElementById('camionId').value;
    const datos = {
      placa: campos.placa.value.trim(),
      modelo: campos.modelo.value.trim(),
      capacidadKg: Number(document.getElementById('capacidadKg').value) || 0,
      zonaAsignada: document.getElementById('zonaAsignadaCamion').value || null,
      estado: document.getElementById('estadoCamion').value,
    };

    try {
      if (idExistente) await actualizarCamion(idExistente, datos);
      else await crearCamion(datos);

      cerrarModal('modalCamion');
      await cargar();
      mostrarToast('success', 'Camión guardado', 'Los datos del vehículo se guardaron correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo guardar el camión', err.message);
    }
  });
})();
