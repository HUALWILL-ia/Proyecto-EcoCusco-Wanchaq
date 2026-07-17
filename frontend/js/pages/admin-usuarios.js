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

  function render() {
    const lista = listaFiltrada();
    const tbody = document.getElementById('tablaUsuarios');

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">👥</div><h3>Sin resultados</h3></div></td></tr>`;
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
        <td>${u.estado === 'activo' ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
        <td>
          <button class="btn btn-sm ${u.estado === 'activo' ? 'btn-outline' : 'btn-secondary'}" data-id="${u.id}" data-accion="toggle">
            ${u.estado === 'activo' ? 'Desactivar' : 'Activar'}
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('button[data-accion="toggle"]').forEach((btn) => {
      btn.addEventListener('click', () => solicitarCambioEstado(btn.dataset.id));
    });

    renderPaginacion(document.getElementById('paginacionUsuarios'), lista.length, POR_PAGINA, paginaActual, (p) => {
      paginaActual = p;
      render();
    });
  }

  async function cargar() {
    const tbody = document.getElementById('tablaUsuarios');
    tbody.innerHTML = `<tr><td colspan="7"><div class="loading-overlay"><span class="spinner"></span> Cargando usuarios...</div></td></tr>`;
    try {
      [todosUsuarios, todasZonas] = await Promise.all([getUsuarios(), obtenerZonas()]);
      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><h3>No se pudo cargar la lista</h3><p>${err.message}</p></div></td></tr>`;
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
})();
