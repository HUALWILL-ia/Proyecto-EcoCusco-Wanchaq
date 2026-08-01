/**
 * pages/admin-zonas.js — CRUD de zonas de recolección (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  let todasZonas = [];

  async function cargar() {
    const tbody = document.getElementById('tablaZonas');
    tbody.innerHTML = `<tr><td colspan="6"><div class="loading-overlay"><span class="spinner"></span> Cargando zonas...</div></td></tr>`;
    try {
      todasZonas = await obtenerZonas();
      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>No se pudieron cargar las zonas</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  function render() {
    const tbody = document.getElementById('tablaZonas');

    if (todasZonas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>Sin zonas registradas</h3></div></td></tr>`;
      return;
    }

    tbody.innerHTML = todasZonas.map((z) => `
      <tr>
        <td><strong>${z.nombre}</strong></td>
        <td>${z.referencia}</td>
        <td>${z.horarioRecoleccion}</td>
        <td><span class="badge badge-neutral">${z.tipoResiduoPrincipal}</span></td>
        <td>${z.contenedores}</td>
        <td>
          <button class="btn btn-outline btn-sm" data-accion="editar" data-id="${z.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-accion="eliminar" data-id="${z.id}">Eliminar</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-accion="editar"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirFormularioEdicion(btn.dataset.id));
    });
    tbody.querySelectorAll('[data-accion="eliminar"]').forEach((btn) => {
      btn.addEventListener('click', () => eliminarZonaExistente(btn.dataset.id));
    });
  }

  cargar();

  const form = document.getElementById('formZona');
  const campos = {
    nombre: document.getElementById('nombre'),
    referencia: document.getElementById('referencia'),
    horario: document.getElementById('horario'),
  };
  const errores = {
    nombre: document.getElementById('errorNombre'),
    referencia: document.getElementById('errorReferencia'),
    horario: document.getElementById('errorHorario'),
  };

  // --- Editor de polígono territorial (Leaflet.draw) ---
  let mapaZona = null;
  let capaDibujoZona = null;

  function inicializarMapaZona(poligonoExistente) {
    if (mapaZona) { mapaZona.remove(); mapaZona = null; }

    const tieneExistente = Array.isArray(poligonoExistente) && poligonoExistente.length >= 3;
    const centro = tieneExistente ? [poligonoExistente[0].lat, poligonoExistente[0].lng] : [-13.529, -71.955];

    mapaZona = L.map('mapaZonaPoligono').setView(centro, tieneExistente ? 15 : 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(mapaZona);

    capaDibujoZona = new L.FeatureGroup().addTo(mapaZona);

    if (tieneExistente) {
      const capaExistente = L.polygon(poligonoExistente.map((p) => [p.lat, p.lng]));
      capaDibujoZona.addLayer(capaExistente);
      mapaZona.fitBounds(capaExistente.getBounds());
    }

    const controlDibujo = new L.Control.Draw({
      draw: { polygon: true, rectangle: true, polyline: false, circle: false, circlemarker: false, marker: false },
      edit: { featureGroup: capaDibujoZona },
    });
    mapaZona.addControl(controlDibujo);

    // Solo se conserva un polígono por zona: cada trazo nuevo reemplaza al anterior.
    mapaZona.on(L.Draw.Event.CREATED, (ev) => {
      capaDibujoZona.clearLayers();
      capaDibujoZona.addLayer(ev.layer);
    });
  }

  function coordenadasDibujadas() {
    if (!capaDibujoZona) return null;
    const capas = capaDibujoZona.getLayers();
    if (capas.length === 0) return null;
    return capas[0].getLatLngs()[0].map((ll) => ({ lat: Number(ll.lat.toFixed(6)), lng: Number(ll.lng.toFixed(6)) }));
  }

  document.getElementById('btnBorrarPoligono').addEventListener('click', () => {
    if (capaDibujoZona) capaDibujoZona.clearLayers();
  });

  document.getElementById('btnNuevaZona').addEventListener('click', () => {
    form.reset();
    document.getElementById('zonaId').value = '';
    document.getElementById('tituloModalZona').textContent = 'Nueva zona';
    abrirModal('modalZona');
    setTimeout(() => inicializarMapaZona(null), 50); // el modal debe estar visible antes de inicializar Leaflet
  });

  function abrirFormularioEdicion(id) {
    const zona = todasZonas.find((z) => String(z.id) === String(id));
    if (!zona) return;
    document.getElementById('zonaId').value = zona.id;
    campos.nombre.value = zona.nombre;
    campos.referencia.value = zona.referencia;
    campos.horario.value = zona.horarioRecoleccion;
    document.getElementById('tipoResiduoPrincipal').value = zona.tipoResiduoPrincipal;
    document.getElementById('contenedores').value = zona.contenedores;
    document.getElementById('tituloModalZona').textContent = `Editar ${zona.nombre}`;
    abrirModal('modalZona');
    setTimeout(() => inicializarMapaZona(zona.poligono), 50);
  }

  async function eliminarZonaExistente(id) {
    try {
      await eliminarZona(id);
      await cargar();
      mostrarToast('success', 'Zona eliminada', 'La zona se eliminó del listado.');
    } catch (err) {
      mostrarToast('error', 'No se pudo eliminar la zona', err.message);
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

    const idExistente = document.getElementById('zonaId').value;
    const datos = {
      nombre: campos.nombre.value.trim(),
      referencia: campos.referencia.value.trim(),
      horarioRecoleccion: campos.horario.value.trim(),
      tipoResiduoPrincipal: document.getElementById('tipoResiduoPrincipal').value,
      contenedores: Number(document.getElementById('contenedores').value) || 0,
    };

    try {
      const zonaGuardada = idExistente ? await actualizarZona(idExistente, datos) : await crearZona(datos);

      const poligono = coordenadasDibujadas();
      if (poligono) {
        await actualizarPoligonoZona(zonaGuardada.id, poligono);
      }

      cerrarModal('modalZona');
      await cargar();
      mostrarToast('success', 'Zona guardada', 'Los datos de la zona se guardaron correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo guardar la zona', err.message);
    }
  });
})();
