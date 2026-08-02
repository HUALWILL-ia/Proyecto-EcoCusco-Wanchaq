/**
 * pages/operador-registro-recoleccion.js — Registro de recolección diaria (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['operador']);
  if (!sesion) return;

  construirSidebar('operador', sesion);
  activarSidebarToggle();

  const selectTipo = document.getElementById('tipoResiduo');

  (async () => {
    try {
      const tipos = await obtenerTiposResiduo();
      tipos.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.nombre;
        opt.textContent = t.nombre;
        selectTipo.appendChild(opt);
      });
    } catch (err) {
      mostrarToast('error', 'No se pudieron cargar los tipos de residuo', err.message);
    }
  })();

  let rutaActiva = null;
  let ciudadanosZona = [];
  let ciudadanoSeleccionado = null;

  const inputBuscadorCiudadano = document.getElementById('buscadorCiudadano');
  const selectCiudadano = document.getElementById('ciudadano');
  const estadoBusquedaCiudadano = document.getElementById('estadoBusquedaCiudadano');

  async function cargarCiudadanosZona(zonaId) {
    try {
      ciudadanosZona = await obtenerCiudadanosPorZona(zonaId);
      estadoBusquedaCiudadano.textContent = ciudadanosZona.length > 0
        ? 'Identifica al vecino cuyo residuo recolectaste (opcional, pero recomendado).'
        : 'No hay ciudadanos registrados en esta zona todavía.';
    } catch (err) {
      ciudadanosZona = [];
      estadoBusquedaCiudadano.textContent = 'No se pudo cargar la lista de vecinos de la zona.';
    }
  }

  function seleccionarCiudadano(ciudadano) {
    ciudadanoSeleccionado = ciudadano;
    inputBuscadorCiudadano.value = `${ciudadano.nombres} ${ciudadano.apellidos} — DNI ${ciudadano.dni}`;
    selectCiudadano.style.display = 'none';
    selectCiudadano.innerHTML = '';
  }

  inputBuscadorCiudadano.addEventListener('input', () => {
    ciudadanoSeleccionado = null;
    const texto = inputBuscadorCiudadano.value.trim().toLowerCase();
    if (texto.length === 0) {
      selectCiudadano.style.display = 'none';
      selectCiudadano.innerHTML = '';
      return;
    }

    const coincidencias = ciudadanosZona.filter((c) =>
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(texto) ||
      c.dni.includes(texto) ||
      (c.direccion || '').toLowerCase().includes(texto)
    );

    if (coincidencias.length === 0) {
      selectCiudadano.style.display = 'none';
      selectCiudadano.innerHTML = '';
      return;
    }

    selectCiudadano.innerHTML = coincidencias.map((c) => `
      <option value="${c.id}">${c.nombres} ${c.apellidos} — DNI ${c.dni}${c.direccion ? ` — ${c.direccion}` : ''}</option>
    `).join('');
    selectCiudadano.style.display = '';
  });

  selectCiudadano.addEventListener('change', () => {
    const ciudadano = ciudadanosZona.find((c) => String(c.id) === selectCiudadano.value);
    if (ciudadano) seleccionarCiudadano(ciudadano);
  });

  const inputFecha = document.getElementById('fechaRecoleccion');
  function fechaLocalISO(fecha) {
    const offsetMs = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() - offsetMs).toISOString().slice(0, 16);
  }
  inputFecha.value = fechaLocalISO(new Date());

  async function renderChecklist() {
    const contenedor = document.getElementById('checklistRuta');
    try {
      const rutas = await obtenerRutasPorOperador();
      rutaActiva = rutas.find((r) => r.estado !== 'completada') || rutas[0] || null;
      if (rutaActiva) await cargarCiudadanosZona(rutaActiva.zona);
    } catch (err) {
      contenedor.innerHTML = `<div class="empty-state"><h3>No se pudo cargar tu ruta</h3><p>${err.message}</p></div>`;
      return;
    }

    if (!rutaActiva) {
      contenedor.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="ph ph-compass" aria-hidden="true"></i></div><h3>Sin ruta activa</h3></div>`;
      return;
    }

    contenedor.innerHTML = `
      <div class="flex justify-between items-center">
        <h3 class="mb-0">${rutaActiva.nombre}</h3>
        ${badgeEstadoRuta(rutaActiva.estado)}
      </div>
      <div class="progress-bar mt-2"><div class="progress-bar-fill" id="barraProgresoRuta" style="width:${rutaActiva.progreso}%"></div></div>
      <p class="text-muted mt-2" id="textoProgresoRuta">${rutaActiva.progreso}% completado</p>
      <ul class="feed-list" id="listaPuntos">
        ${rutaActiva.puntos.map((p) => `
          <li class="feed-item">
            <div class="form-check">
              <input type="checkbox" id="punto-${p.orden}" data-orden="${p.orden}" ${p.completado ? 'checked' : ''}>
              <label for="punto-${p.orden}">${p.direccion}</label>
            </div>
          </li>
        `).join('')}
      </ul>
    `;

    contenedor.querySelectorAll('input[type="checkbox"]').forEach((chk) => {
      chk.addEventListener('change', () => marcarPunto(Number(chk.dataset.orden), chk.checked));
    });
  }

  async function marcarPunto(orden, completado) {
    try {
      const actualizada = await actualizarPuntoRuta(rutaActiva.id, orden, completado);
      rutaActiva = actualizada;
      document.getElementById('barraProgresoRuta').style.width = `${rutaActiva.progreso}%`;
      document.getElementById('textoProgresoRuta').textContent = `${rutaActiva.progreso}% completado`;
      mostrarToast('success', 'Punto actualizado', `${rutaActiva.progreso}% de la ruta completado.`);
    } catch (err) {
      mostrarToast('error', 'No se pudo actualizar el punto', err.message);
      renderChecklist();
    }
  }

  renderChecklist();

  async function renderHistorialHoy() {
    const tbody = document.getElementById('tablaHistorialHoy');
    try {
      const hoy = new Date().toDateString();
      const registros = (await obtenerMisRecolecciones())
        .filter((r) => new Date(r.fecha).toDateString() === hoy)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      if (registros.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><h3>Sin registros hoy</h3></div></td></tr>`;
        return;
      }
      tbody.innerHTML = registros.map((r) => `
        <tr>
          <td>${new Date(r.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${r.rutaNombre}</td>
          <td>${r.tipoResiduo}</td>
          <td>${r.kg} kg</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><h3>No se pudo cargar el historial</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  renderHistorialHoy();

  const form = document.getElementById('formRecoleccion');
  const inputKg = document.getElementById('kgRecolectados');
  const errorKg = document.getElementById('errorKg');
  const btn = document.getElementById('btnRegistrar');

  const errorFecha = document.getElementById('errorFecha');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errorKg.textContent = '';
    errorKg.classList.remove('show');
    errorFecha.textContent = '';
    errorFecha.classList.remove('show');

    const kg = Number(inputKg.value);
    if (!inputKg.value || kg <= 0) {
      inputKg.classList.add('is-invalid');
      errorKg.textContent = 'Ingresa una cantidad válida en kilogramos.';
      errorKg.classList.add('show');
      return;
    }
    inputKg.classList.remove('is-invalid');

    if (!inputFecha.value) {
      inputFecha.classList.add('is-invalid');
      errorFecha.textContent = 'La fecha y hora son obligatorias.';
      errorFecha.classList.add('show');
      return;
    }
    inputFecha.classList.remove('is-invalid');

    if (!rutaActiva) {
      mostrarToast('error', 'Sin ruta activa', 'No tienes una ruta asignada para registrar.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Guardando...';

    const teniaCiudadano = Boolean(ciudadanoSeleccionado);
    const tipoResiduoTexto = selectTipo.value;

    try {
      await crearRecoleccion({
        rutaId: rutaActiva.id,
        usuarioId: ciudadanoSeleccionado ? ciudadanoSeleccionado.id : null,
        tipoResiduo: tipoResiduoTexto,
        kg,
        fecha: new Date(inputFecha.value).toISOString(),
        observaciones: document.getElementById('observaciones').value.trim(),
      });

      form.reset();
      ciudadanoSeleccionado = null;
      selectCiudadano.style.display = 'none';
      selectCiudadano.innerHTML = '';
      inputFecha.value = fechaLocalISO(new Date());
      renderHistorialHoy();
      mostrarToast(
        'success',
        'Recolección registrada',
        teniaCiudadano
          ? `Se registraron ${kg} kg de ${tipoResiduoTexto} y se notificó al ciudadano.`
          : `Se registraron ${kg} kg de ${tipoResiduoTexto}.`
      );
    } catch (err) {
      mostrarToast('error', 'No se pudo registrar la recolección', err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar registro';
    }
  });
})();
