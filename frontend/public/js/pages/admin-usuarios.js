/**
 * pages/admin-usuarios.js — Gestión de usuarios (Fase 2, backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  const POR_PAGINA = 8;
  let paginaActual = 1;
  let filtros = { texto: '', rol: '', estado: '' };
  let usuarioSeleccionadoId = null;
  let todosUsuarios = [];
  let todasZonas = [];
  let todasCamiones = [];
  let todasRutas = [];

  const ROL_LABEL = { admin: 'Administrador', operador: 'Operador', ciudadano: 'Ciudadano' };
  const ROL_BADGE = { admin: 'badge-info', operador: 'badge-warning', ciudadano: 'badge-success' };

  function listaFiltrada() {
    return todosUsuarios.filter((u) => {
      const coincideTexto = !filtros.texto || (
        `${u.nombres} ${u.apellidos}`.toLowerCase().includes(filtros.texto) ||
        u.dni.includes(filtros.texto) ||
        u.correo.toLowerCase().includes(filtros.texto)
      );
      const coincideRol = !filtros.rol || u.rol === filtros.rol;
      const coincideEstado = !filtros.estado || u.estado === filtros.estado;
      return coincideTexto && coincideRol && coincideEstado;
    });
  }

  function zonaDeUsuario(u) {
    if (u.rol === 'ciudadano') return u.zona || '—';
    if (u.rol === 'operador') {
      const z = todasZonas.find((zona) => zona.id === u.zonaAsignada);
      return z ? z.nombre : '—';
    }
    return '—';
  }

  function camionDeUsuario(u) {
    if (u.rol !== 'operador') return '—';
    const c = todasCamiones.find((camion) => camion.id === u.camionAsignado);
    return c ? c.placa : '—';
  }

  function operadorTieneRutaActiva(operadorId) {
    return todasRutas.some((r) => r.operador === operadorId && r.estado === 'en_progreso');
  }

  function render() {
    const lista = listaFiltrada();
    const tbody = document.getElementById('tablaUsuarios');

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">👥</div><h3>Sin resultados</h3></div></td></tr>`;
      document.getElementById('paginacionUsuarios').innerHTML = '';
      return;
    }

    const inicio = (paginaActual - 1) * POR_PAGINA;
    const paginaLista = lista.slice(inicio, inicio + POR_PAGINA);

    tbody.innerHTML = paginaLista.map((u) => `
      <tr>
        <td>${u.nombres} ${u.apellidos}</td>
        <td><span class="badge ${ROL_BADGE[u.rol]}">${ROL_LABEL[u.rol]}</span></td>
        <td>${u.dni}</td>
        <td>${u.correo}</td>
        <td>${zonaDeUsuario(u)}</td>
        <td>${camionDeUsuario(u)}</td>
        <td>${u.estado === 'activo' ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
        <td>
          <button class="btn btn-sm ${u.estado === 'activo' ? 'btn-outline' : 'btn-secondary'}" data-id="${u.id}" data-accion="toggle">
            ${u.estado === 'activo' ? 'Desactivar' : 'Activar'}
          </button>
          <button class="btn btn-sm btn-outline" data-id="${u.id}" data-accion="reset-password">
            Restablecer contraseña
          </button>
          ${u.rol === 'operador' ? `<button class="btn btn-sm btn-secondary" data-id="${u.id}" data-accion="reasignar">Reasignar zona/camión</button>` : ''}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('button[data-accion="toggle"]').forEach((btn) => {
      btn.addEventListener('click', () => solicitarCambioEstado(btn.dataset.id));
    });
    tbody.querySelectorAll('button[data-accion="reset-password"]').forEach((btn) => {
      btn.addEventListener('click', () => solicitarResetPassword(btn.dataset.id));
    });
    tbody.querySelectorAll('button[data-accion="reasignar"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirModalAsignacion(btn.dataset.id));
    });

    renderPaginacion(document.getElementById('paginacionUsuarios'), lista.length, POR_PAGINA, paginaActual, (p) => {
      paginaActual = p;
      render();
    });
  }

  async function cargar() {
    const tbody = document.getElementById('tablaUsuarios');
    tbody.innerHTML = `<tr><td colspan="8"><div class="loading-overlay"><span class="spinner"></span> Cargando usuarios...</div></td></tr>`;
    try {
      [todosUsuarios, todasZonas, todasCamiones, todasRutas] = await Promise.all([getUsuarios(), obtenerZonas(), getCamionesStorage(), getRutas()]);
      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><h3>No se pudo cargar la lista</h3><p>${err.message}</p></div></td></tr>`;
    }
  }

  cargar();

  document.getElementById('buscador').addEventListener('input', (ev) => {
    filtros.texto = ev.target.value.trim().toLowerCase();
    paginaActual = 1;
    render();
  });
  document.getElementById('filtroRol').addEventListener('change', (ev) => {
    filtros.rol = ev.target.value;
    paginaActual = 1;
    render();
  });
  document.getElementById('filtroEstado').addEventListener('change', (ev) => {
    filtros.estado = ev.target.value;
    paginaActual = 1;
    render();
  });

  function solicitarCambioEstado(id) {
    const usuario = todosUsuarios.find((u) => String(u.id) === String(id));
    if (!usuario) return;
    if (String(usuario.id) === String(sesion.usuario.id)) {
      mostrarToast('error', 'Acción no permitida', 'No puedes desactivar tu propia cuenta.');
      return;
    }

    usuarioSeleccionadoId = id;
    const accion = usuario.estado === 'activo' ? 'desactivar' : 'activar';
    document.getElementById('tituloModalEstado').textContent = `¿${accion === 'desactivar' ? 'Desactivar' : 'Activar'} cuenta?`;
    document.getElementById('textoModalEstado').textContent =
      `Estás a punto de ${accion} la cuenta de ${usuario.nombres} ${usuario.apellidos} (${ROL_LABEL[usuario.rol]}).`;
    abrirModal('modalEstado');
  }

  document.getElementById('btnConfirmarEstado').addEventListener('click', async () => {
    try {
      const actualizado = await cambiarEstadoUsuario(usuarioSeleccionadoId);
      const idx = todosUsuarios.findIndex((u) => String(u.id) === String(usuarioSeleccionadoId));
      if (idx >= 0) todosUsuarios[idx] = actualizado;
      mostrarToast('success', 'Estado actualizado', `La cuenta ahora está ${actualizado.estado}.`);
    } catch (err) {
      mostrarToast('error', 'No se pudo actualizar el estado', err.message);
    }
    cerrarModal('modalEstado');
    render();
  });

  let correoResetSeleccionado = null;

  function solicitarResetPassword(id) {
    const usuario = todosUsuarios.find((u) => String(u.id) === String(id));
    if (!usuario) return;

    correoResetSeleccionado = usuario.correo;
    document.getElementById('textoModalResetPassword').textContent =
      `Se enviará una contraseña temporal nueva al correo de ${usuario.nombres} ${usuario.apellidos} (${usuario.correo}).`;
    abrirModal('modalResetPassword');
  }

  document.getElementById('btnConfirmarResetPassword').addEventListener('click', async () => {
    const btn = document.getElementById('btnConfirmarResetPassword');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Enviando...';

    const resultado = await olvidarPassword(correoResetSeleccionado);

    btn.disabled = false;
    btn.textContent = 'Restablecer';
    cerrarModal('modalResetPassword');

    if (!resultado.ok) {
      mostrarToast('error', 'No se pudo restablecer la contraseña', resultado.mensaje);
      return;
    }
    mostrarToast('success', 'Contraseña restablecida', resultado.mensaje);
  });

  let operadorAsignacionId = null;

  function abrirModalAsignacion(id) {
    const usuario = todosUsuarios.find((u) => String(u.id) === String(id));
    if (!usuario) return;
    operadorAsignacionId = usuario.id;

    document.getElementById('textoModalAsignacion').textContent =
      `Asigna la zona de recolección y el camión de ${usuario.nombres} ${usuario.apellidos}.`;

    const selectZona = document.getElementById('selectZonaAsignacion');
    selectZona.innerHTML = '<option value="">Sin asignar</option>' +
      todasZonas.filter((z) => z.estado === 'activa').map((z) => `
        <option value="${z.id}" ${z.id === usuario.zonaAsignada ? 'selected' : ''}>${z.nombre}</option>
      `).join('');

    const selectCamion = document.getElementById('selectCamionAsignacion');
    const camionesElegibles = todasCamiones.filter((c) => c.estado === 'operativo' && (!c.operadorAsignado || c.operadorAsignado === usuario.id));
    selectCamion.innerHTML = '<option value="">Sin asignar</option>' +
      camionesElegibles.map((c) => `
        <option value="${c.id}" ${c.id === usuario.camionAsignado ? 'selected' : ''}>${c.placa} — ${c.modelo}</option>
      `).join('');

    document.getElementById('avisoRutaActivaAsignacion').style.display = operadorTieneRutaActiva(usuario.id) ? '' : 'none';

    abrirModal('modalAsignacion');
  }

  document.getElementById('btnConfirmarAsignacion').addEventListener('click', async () => {
    if (operadorTieneRutaActiva(operadorAsignacionId)) {
      const continuar = confirm('Este operador tiene una ruta en curso ahora mismo. ¿Seguro que quieres reasignarlo? Esto puede interrumpir una recolección activa.');
      if (!continuar) return;
    }

    const zonaId = document.getElementById('selectZonaAsignacion').value || null;
    const camionId = document.getElementById('selectCamionAsignacion').value || null;

    const btn = document.getElementById('btnConfirmarAsignacion');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Guardando...';

    try {
      const actualizado = await asignarZonaCamionOperador(operadorAsignacionId, { zonaId, camionId });
      const idx = todosUsuarios.findIndex((u) => u.id === operadorAsignacionId);
      if (idx >= 0) todosUsuarios[idx] = actualizado;
      todasCamiones = await getCamionesStorage(); // refresca ocupación de camiones (liberado/tomado)
      cerrarModal('modalAsignacion');
      render();
      mostrarToast('success', 'Asignación actualizada', 'Zona y camión reasignados correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo reasignar', err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar asignación';
    }
  });
})();
