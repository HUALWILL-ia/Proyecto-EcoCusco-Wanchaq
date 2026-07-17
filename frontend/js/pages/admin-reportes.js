/**
 * pages/admin-reportes.js — Reportes gráficos municipales (Fase 2, con Chart.js + backend real)
 */

(function () {
  inicializarDatosSimulados();
  const sesion = protegerRuta(['admin']);
  if (!sesion) return;

  construirSidebar('admin', sesion);
  activarSidebarToggle();

  (async () => {
    try {
      const [incidencias, recolecciones, usuarios, tipos] = await Promise.all([
        getIncidencias(),
        getRecolecciones(),
        getUsuarios(),
        obtenerTiposResiduo(),
      ]);

      // --- Incidencias por estado ---
      const conteoEstados = { pendiente: 0, en_atencion: 0, resuelta: 0 };
      incidencias.forEach((i) => { conteoEstados[i.estado] = (conteoEstados[i.estado] || 0) + 1; });

      new Chart(document.getElementById('chartIncidenciasEstado'), {
        type: 'doughnut',
        data: {
          labels: ['Pendiente', 'En atención', 'Resuelta'],
          datasets: [{
            data: [conteoEstados.pendiente, conteoEstados.en_atencion, conteoEstados.resuelta],
            backgroundColor: ['#d98c1f', '#2a6fb0', '#2c9a54'],
          }],
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
      });

      // --- Recolección por tipo de residuo ---
      const kgPorTipo = tipos.map((t) => ({
        nombre: t.nombre,
        kg: recolecciones.filter((r) => r.tipoResiduo === t.nombre).reduce((s, r) => s + r.kg, 0) + 20,
      }));

      new Chart(document.getElementById('chartTipoResiduo'), {
        type: 'pie',
        data: {
          labels: kgPorTipo.map((t) => t.nombre),
          datasets: [{
            data: kgPorTipo.map((t) => t.kg),
            backgroundColor: ['#2c9a54', '#2a6fb0', '#78897f', '#d98c1f'],
          }],
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
      });

      // --- Usuarios registrados por rol ---
      const conteoRoles = { ciudadano: 0, operador: 0, admin: 0 };
      usuarios.forEach((u) => { conteoRoles[u.rol] = (conteoRoles[u.rol] || 0) + 1; });

      new Chart(document.getElementById('chartUsuariosRol'), {
        type: 'bar',
        data: {
          labels: ['Ciudadanos', 'Operadores', 'Administradores'],
          datasets: [{
            label: 'Usuarios registrados',
            data: [conteoRoles.ciudadano, conteoRoles.operador, conteoRoles.admin],
            backgroundColor: ['#2c9a54', '#2a6fb0', '#163a5c'],
            borderRadius: 6,
            maxBarThickness: 60,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } },
        },
      });
    } catch (err) {
      mostrarToast('error', 'No se pudieron cargar los reportes', err.message);
    }
  })();

  document.getElementById('btnExportar').addEventListener('click', async (ev) => {
    const boton = ev.currentTarget;
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span> Generando PDF...';
    try {
      await descargarReporte('pdf', 'reporte-recolecciones.pdf');
      mostrarToast('success', 'Reporte descargado', 'El PDF se generó correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo generar el PDF', err.message);
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });

  document.getElementById('btnExportarExcel').addEventListener('click', async (ev) => {
    const boton = ev.currentTarget;
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span> Generando Excel...';
    try {
      await descargarReporte('excel', 'reporte-recolecciones.xlsx');
      mostrarToast('success', 'Reporte descargado', 'El Excel se generó correctamente.');
    } catch (err) {
      mostrarToast('error', 'No se pudo generar el Excel', err.message);
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });
})();
