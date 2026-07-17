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

  async function renderChecklist() {
    const contenedor = document.getElementById('checklistRuta');
    try {
      const rutas = await obtenerRutasPorOperador();
      rutaActiva = rutas.find((r) => r.estado !== 'completada') || rutas[0] || null;
    } catch (err) {
      contenedor.innerHTML = `<div class="empty-state"><h3>No se pudo cargar tu ruta</h3><p>${err.message}</p></div>`;
      return;
    }

    if (!rutaActiva) {
      contenedor.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🧭</div><h3>Sin ruta activa</h3></div>`;
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

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errorKg.textContent = '';
    errorKg.classList.remove('show');

    const kg = Number(inputKg.value);
    if (!inputKg.value || kg <= 0) {
      inputKg.classList.add('is-invalid');
      errorKg.textContent = 'Ingresa una cantidad válida en kilogramos.';
      errorKg.classList.add('show');
      return;
    }
    inputKg.classList.remove('is-invalid');

    if (!rutaActiva) {
      mostrarToast('error', 'Sin ruta activa', 'No tienes una ruta asignada para registrar.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Guardando...';

    try {
      await crearRecoleccion({
        rutaId: rutaActiva.id,
        tipoResiduo: selectTipo.value,
        kg,
        observaciones: document.getElementById('observaciones').value.trim(),
      });

      form.reset();
      renderHistorialHoy();
      mostrarToast('success', 'Recolección registrada', `Se registraron ${kg} kg de ${selectTipo.value}.`);
    } catch (err) {
      mostrarToast('error', 'No se pudo registrar la recolección', err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar registro';
    }
  });
})();
