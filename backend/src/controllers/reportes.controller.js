/**
 * controllers/reportes.controller.js
 * KPIs por rol para los dashboards y exportación de reportes (PDF / Excel)
 * con pdfkit y exceljs, ambos gratuitos y sin dependencias nativas.
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const usuariosRepo = require('../repositories/usuarios.repository');
const zonasRepo = require('../repositories/zonas.repository');
const incidenciasRepo = require('../repositories/incidencias.repository');
const recoleccionesRepo = require('../repositories/recolecciones.repository');
const camionesRepo = require('../repositories/camiones.repository');
const rutasRepo = require('../repositories/rutas.repository');
const asyncHandler = require('../utils/asyncHandler');

const esMismoDia = (fechaIso) => new Date(fechaIso).toDateString() === new Date().toDateString();

/**
 * GET /api/reportes/kpis-admin
 */
const kpisAdmin = asyncHandler(async (req, res) => {
  const [usuarios, zonas, incidencias, recolecciones, rutas, camiones] = await Promise.all([
    usuariosRepo.leerTodos(),
    zonasRepo.leerTodos(),
    incidenciasRepo.leerTodos(),
    recoleccionesRepo.leerTodos(),
    rutasRepo.leerTodos(),
    camionesRepo.leerTodos(),
  ]);

  const recoleccionesPorZona = zonas.map((z) => {
    const rutasZona = rutas.filter((r) => r.zona === z.id).map((r) => r.id);
    const kg = recolecciones.filter((r) => rutasZona.includes(r.rutaId)).reduce((s, r) => s + r.kg, 0);
    return { zona: z.nombre, kg: Math.round(z.poblacionEstimada / 45) + kg };
  });

  const actividadReciente = [
    ...incidencias.map((i) => ({ texto: `Nueva incidencia: ${i.tipo} en ${i.zona}`, fecha: i.fecha })),
    ...recolecciones.map((r) => ({ texto: `Recolección registrada: ${r.kg} kg (${r.tipoResiduo}) — ${r.rutaNombre}`, fecha: r.fecha })),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 6);

  res.json({
    success: true,
    data: {
      usuariosActivos: usuarios.filter((u) => u.estado === 'activo').length,
      usuariosTotal: usuarios.length,
      zonas: zonas.length,
      incidenciasPendientes: incidencias.filter((i) => i.estado === 'pendiente').length,
      incidenciasTotal: incidencias.length,
      recoleccionesHoy: recolecciones.filter((r) => esMismoDia(r.fecha)).length,
      recoleccionesPorZona,
      actividadReciente,
      flota: camiones.map((c) => ({
        ...c,
        zonaNombre: zonas.find((z) => z.id === c.zonaAsignada)?.nombre || null,
      })),
    },
  });
});

/**
 * GET /api/reportes/kpis-ciudadano
 */
const kpisCiudadano = asyncHandler(async (req, res) => {
  const usuario = await usuariosRepo.buscarPorId(req.user.sub);
  const incidenciasPropias = await incidenciasRepo.buscarPorUsuario(req.user.sub);
  const zona = usuario?.zona ? await zonasRepo.buscarPorNombre(usuario.zona) : null;

  res.json({
    success: true,
    data: {
      kgReciclados: usuario?.kgReciclados ?? 0,
      nivelEcologico: usuario?.nivelEcologico ?? 'Eco Semilla',
      incidenciasActivas: incidenciasPropias.filter((i) => i.estado !== 'resuelta').length,
      proximaRecoleccion: zona || null,
      incidenciasRecientes: incidenciasPropias.slice(0, 4),
    },
  });
});

/**
 * GET /api/reportes/kpis-operador
 */
const kpisOperador = asyncHandler(async (req, res) => {
  const usuario = await usuariosRepo.buscarPorId(req.user.sub);
  const rutas = await rutasRepo.buscarPorOperador(req.user.sub);
  const rutaHoy = rutas.find((r) => r.estado !== 'completada') || rutas[0] || null;
  const camion = usuario?.camionAsignado ? await camionesRepo.buscarPorId(usuario.camionAsignado) : null;
  const incidenciasPropias = await incidenciasRepo.buscarPorUsuario(req.user.sub);

  res.json({
    success: true,
    data: { rutaHoy, camion, incidenciasReportadas: incidenciasPropias.length },
  });
});

/**
 * GET /api/reportes/exportar/pdf (admin) — historial de recolecciones en PDF.
 */
const exportarPDF = asyncHandler(async (req, res) => {
  const recolecciones = await recoleccionesRepo.leerTodos();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-recolecciones.pdf"');

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(16).text('EcoRutas Wanchaq — Reporte de recolecciones', { align: 'center' });
  doc.fontSize(10).fillColor('#666').text('Municipalidad Distrital de Wanchaq — Gerencia de Gestión Ambiental', { align: 'center' });
  doc.moveDown(1.5);

  doc.fillColor('#000').fontSize(11);
  recolecciones.forEach((r) => {
    doc.text(`${new Date(r.fecha).toLocaleString('es-PE')}  |  ${r.rutaNombre}  |  ${r.tipoResiduo}  |  ${r.kg} kg`);
  });

  if (recolecciones.length === 0) doc.text('Sin registros de recolección todavía.');

  doc.end();
});

/**
 * GET /api/reportes/exportar/excel (admin) — historial de recolecciones en Excel.
 */
const exportarExcel = asyncHandler(async (req, res) => {
  const recolecciones = await recoleccionesRepo.leerTodos();

  const libro = new ExcelJS.Workbook();
  libro.creator = 'EcoRutas Wanchaq';
  const hoja = libro.addWorksheet('Recolecciones');

  hoja.columns = [
    { header: 'Fecha', key: 'fecha', width: 22 },
    { header: 'Operador', key: 'operador', width: 16 },
    { header: 'Ruta', key: 'rutaNombre', width: 30 },
    { header: 'Tipo de residuo', key: 'tipoResiduo', width: 20 },
    { header: 'Kg', key: 'kg', width: 10 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
  ];
  hoja.getRow(1).font = { bold: true };

  recolecciones.forEach((r) => {
    hoja.addRow({
      fecha: new Date(r.fecha).toLocaleString('es-PE'),
      operador: r.operador,
      rutaNombre: r.rutaNombre,
      tipoResiduo: r.tipoResiduo,
      kg: r.kg,
      observaciones: r.observaciones,
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-recolecciones.xlsx"');

  await libro.xlsx.write(res);
  res.end();
});

module.exports = { kpisAdmin, kpisCiudadano, kpisOperador, exportarPDF, exportarExcel };
