/**
 * pages/admin-rutas.js — Planificación y asignación de rutas (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  const selectZona = document.getElementById('zonaRuta');
  const selectCamion = document.getElementById('camionRuta');
  const selectOperador = document.getElementById('operadorRuta');

  let todasRutas = [];
  let todasZonas = [];
  let todosCamiones = [];
  let todosUsuarios = [];

  async function cargarSelects() {
    todasZonas.forEach((z) => {
      const opt = document.createElement('option');
      opt.value = z.id;
      opt.textContent = z.nombre;
      selectZona.appendChild(opt);
    });
    todosCamiones.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.placa;
      selectCamion.appendChild(opt);
    });
    todosUsuarios.filter((u) => u.rol === 'operador').forEach((op) => {
      const opt = document.createElement('option');
      opt.value = op.id;
      opt.textContent = `${op.nombres} ${op.apellidos}`;
      selectOperador.appendChild(opt);
    });
  }

  function render() {
    const contenedor = document.getElementById('listaRutasAdmin');

    if (todasRutas.length === 0) {
      contenedor.innerHTML = `<div class="card"><div class="empty-state"><h3>Sin rutas registradas</h3></div></div>`;
      return;
    }

    contenedor.innerHTML = todasRutas.map((ruta) => {
      const zona = todasZonas.find((z) => z.id === ruta.zona);
      const camion = todosCamiones.find((c) => c.id === ruta.camion);
      const operador = todosUsuarios.find((u) => u.id === ruta.operador);
      return `
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="mb-0">${ruta.nombre}</h2>
              <span class="text-muted">Zona: ${zona ? zona.nombre : '—'} · Turno: ${ruta.turno}</span>
            </div>
            ${badgeEstadoRuta(ruta.estado)}
          </div>
          <p><strong>Camión:</strong> ${camion ? camion.placa : 'Sin asignar'} &nbsp;|&nbsp; <strong>Operador:</strong> ${operador ? operador.nombres + ' ' + operador.apellidos : 'Sin asignar'}</p>
          <div class="progress-bar"><div class="progress-bar-fill" style="width:${ruta.progreso}%"></div></div>
          <p class="text-muted mt-2">${ruta.progreso}% completado — ${ruta.puntos.filter((p) => p.completado).length}/${ruta.puntos.length} puntos</p>
          <div class="flex gap-2 mt-3">
            <button class="btn btn-outline btn-sm" data-accion="editar" data-id="${ruta.id}">Editar</button>
            <button class="btn btn-danger btn-sm" data-accion="eliminar" data-id="${ruta.id}">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    contenedor.querySelectorAll('[data-accion="editar"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirEdicion(btn.dataset.id));
    });
    contenedor.querySelectorAll('[data-accion="eliminar"]').forEach((btn) => {
      btn.addEventListener('click', () => eliminar(btn.dataset.id));
    });
  }

  async function cargar() {
    const contenedor = document.getElementById('listaRutasAdmin');
    contenedor.innerHTML = `<div class="card"><div class="loading-overlay"><span class="spinner"></span> Cargando rutas...</div></div>`;
    try {
      [todasRutas, todasZonas, todosCamiones, todosUsuarios] = await Promise.all([
        getRutas(),
        obtenerZonas(),
        obtenerCamiones(),
        getUsuarios(),
      ]);
      if (selectZona.options.length <= 0) await cargarSelects();
      render();
    } catch (err) {
      contenedor.innerHTML = `<div class="card"><div class="empty-state"><h3>No se pudieron cargar las rutas</h3><p>${err.message}</p></div></div>`;
    }
  }

  cargar();

  const form = document.getElementById('formRuta');
  const campoNombre = document.getElementById('nombreRuta');
  const errorNombre = document.getElementById('errorNombreRuta');
  const campoPuntos = document.getElementById('puntosRuta');
  const errorPuntos = document.getElementById('errorPuntosRuta');

  document.getElementById('btnNuevaRuta').addEventListener('click', () => {
    form.reset();
    document.getElementById('rutaId').value = '';
    document.getElementById('tituloModalRuta').textContent = 'Nueva ruta';
    abrirModal('modalRuta');
  });

  function abrirEdicion(id) {
    const ruta = todasRutas.find((r) => String(r.id) === String(id));
    if (!ruta) return;
    document.getElementById('rutaId').value = ruta.id;
    campoNombre.value = ruta.nombre;
    selectZona.value = ruta.zona || '';
    document.getElementById('turnoRuta').value = ruta.turno;
    selectCamion.value = ruta.camion || '';
    selectOperador.value = ruta.operador || '';
    campoPuntos.value = ruta.puntos.map((p) => p.direccion).join('\n');
    document.getElementById('tituloModalRuta').textContent = `Editar ${ruta.nombre}`;
    abrirModal('modalRuta');
  }

  async function eliminar(id) {
    try {
      await eliminarRuta(id);
      await cargar();
      mostrarToast('success', 'Ruta eliminada', 'La ruta se eliminó de la planificación.');
    } catch (err) {
      mostrarToast('error', 'No se pudo eliminar la ruta', err.message);
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    campoNombre.classList.remove('is-invalid');
    errorNombre.textContent = '';
    errorNombre.classList.remove('show');
    campoPuntos.classList.remove('is-invalid');
    errorPuntos.textContent = '';
    errorPuntos.classList.remove('show');

    let valido = true;
    const vNombre = validarCampoObligatorio(campoNombre.value);
    if (!vNombre.valido) { campoNombre.classList.add('is-invalid'); errorNombre.textContent = vNombre.mensaje; errorNombre.classList.add('show'); valido = false; }

    const lineas = campoPuntos.value.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lineas.length === 0) {
      campoPuntos.classList.add('is-invalid');
      errorPuntos.textContent = 'Ingresa al menos un punto de recolección.';
      errorPuntos.classList.add('show');
      valido = false;
    }
    if (!valido) return;

    const idExistente = document.getElementById('rutaId').value;
    const rutaExistente = idExistente ? todasRutas.find((r) => String(r.id) === String(idExistente)) : null;

    // Si la cantidad de puntos no cambió, conserva el estado "completado" de
    // cada uno y solo actualiza el texto; si cambió, se reinicia el checklist.
    const puntos = rutaExistente && lineas.length === rutaExistente.puntos.length
      ? rutaExistente.puntos.map((p, i) => ({ ...p, direccion: lineas[i] }))
      : lineas.map((direccion, i) => ({ orden: i + 1, direccion, completado: false }));

    const datos = {
      nombre: campoNombre.value.trim(),
      zona: selectZona.value || null,
      turno: document.getElementById('turnoRuta').value.trim(),
      camion: selectCamion.value || null,
      operador: selectOperador.value || null,
      puntos,
    };

    try {
      if (idExistente) await actualizarRuta(idExistente, datos);
      else await crearRuta(datos);

      cerrarModal('modalRuta');
      await cargar();
      mostrarToast('success', 'Ruta guardada', 'La ruta se guardó correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo guardar la ruta', err.message);
    }
  });
})();
