const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const S = __dirname;
const URL_ = 'file:///home/user/propuesta-grupo-vila-soloOCR/demo-minimo/index.html';
const XLSX_LOCAL = fs.readFileSync(path.join(S, 'node_modules/xlsx/dist/xlsx.full.min.js'), 'utf8');
const results = [];
function check(name, ok, note) { results.push({ name, ok: !!ok, note: note || '' }); console.log((ok ? '✓' : '✗') + ' ' + name + (note ? '  — ' + note : '')); }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('dialog', d => d.accept());
  await page.route('**/cdn.jsdelivr.net/**xlsx**', r => r.fulfill({ contentType: 'application/javascript', body: XLSX_LOCAL }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto(URL_);
  await page.waitForSelector('#dropzone');

  const shot = async (n) => { await page.evaluate(() => document.getElementById('toast-wrap').innerHTML=''); await page.screenshot({ path: path.join(S, 'shots', n + '.png'), fullPage: !/detalle/.test(n) || /^1440/.test(n) ? true : false }); };
  fs.mkdirSync(path.join(S, 'shots'), { recursive: true });

  // --- Estado inicial
  check('Topbar: marca, 3 pestañas y reiniciar', (await page.textContent('.brand')).includes('Carga de comprobantes · Grupo Demo') && (await page.locator('.tab').count()) === 3 && await page.locator('text=↺ Reiniciar demo').count() === 1);
  check('Contador inicial en Bandeja = 3', (await page.textContent('#tab-count')) === '3');
  check('Pie "Prototipo — Anavic AI"', (await page.textContent('footer.foot')) === 'Prototipo — Anavic AI');

  // --- Carga real: PNG + PDF
  await page.setInputFiles('#inp-archivos', [path.join(S, 'prueba.png'), path.join(S, 'prueba.pdf')]);
  check('Filas por archivo con estado "Leyendo con IA…"', (await page.locator('.carga-row').count()) === 2 && (await page.locator('.carga-row .badge-ia').count()) === 2);
  await shot('1440-cargar-leyendo');
  await page.waitForSelector('#aviso-bandeja', { timeout: 6000 });
  check('Aviso final "2 comprobantes en la bandeja para revisar"', (await page.textContent('#aviso-bandeja')).includes('2 comprobantes en la bandeja para revisar'));
  check('Miniatura de imagen real en la fila', await page.locator('.carga-row img[src^="blob:"]').count() === 1);
  check('Contador de Bandeja sube a 5', (await page.textContent('#tab-count')) === '5');

  // --- Ejemplos
  await page.click('text=✨ Usar comprobantes de ejemplo');
  await page.waitForFunction(() => document.querySelectorAll('.carga-row .chip-verde').length === 6, null, { timeout: 8000 });
  check('"Usar comprobantes de ejemplo" carga 4 casos', (await page.locator('.carga-row').count()) === 6);
  await shot('1440-cargar-listo');
  check('Aviso final 6 comprobantes', (await page.textContent('#aviso-bandeja')).includes('6 comprobantes en la bandeja'));

  // --- Bandeja
  await page.click('.tab:has-text("Bandeja")');
  const cnt = async (id) => +(await page.textContent(`[data-etapa="${id}"] .eh-title + .chip`));
  check('Bandeja: 3 columnas con contadores 8 / 1 / 8', (await cnt('pendiente')) === 8 && (await cnt('validado')) === 1 && (await cnt('registrado')) === 8, `${await cnt('pendiente')}/${await cnt('validado')}/${await cnt('registrado')}`);
  check('Franja del circuito presente', (await page.textContent('.etapas-banner')).includes('Leído por IA') && (await page.textContent('.etapas-banner')).includes('Registrado'));
  check('Chip "Posible duplicado" en tarjeta', await page.locator('[data-etapa="pendiente"] .chip-rojo').count() === 1);
  check('Chip "Revisar lectura" (ejemplo manuscrito + seed + posible aleatorio)', await page.locator('[data-etapa="pendiente"] .chip-ambar:has-text("Revisar lectura")').count() >= 2);
  await shot('1440-bandeja');

  // --- Detalle PNG: imagen real
  // abrir por nombre de archivo: buscamos la carga PNG vía estado
  const pngId = await page.evaluate(() => state.comps.find(c => c.archivo.nombre === 'prueba.png').id);
  const pdfId = await page.evaluate(() => state.comps.find(c => c.archivo.nombre === 'prueba.pdf').id);
  await page.click(`.etapa-card[data-id="${pngId}"]`);
  await page.waitForSelector('.doc-stage');
  check('Detalle: imagen subida se muestra de verdad (blob)', await page.locator('.doc-stage img[src^="blob:"]').count() === 1 && await page.evaluate(() => document.querySelector('.doc-stage img').naturalWidth > 0));
  check('Botón Validar deshabilitado sin local', await page.locator('#btn-validar').isDisabled());
  check('Texto de ayuda dice qué falta', (await page.textContent('#val-hint')).includes('Elegí a qué local'));

  // Reparto en 3 locales, partes iguales, total 100,01 → 33,34 + 33,34 + 33,33
  await page.fill('[data-field="total"]', '100,01');
  await page.click('[data-action="modo-local"][data-modo="varios"]');
  await page.check('[data-local="pizzeria"]'); // el primero se agrega vía toggle
  await page.check('[data-local="parrilla1"]');
  await page.check('[data-local="heladeria"]');
  const st = await page.textContent('#rep-status');
  check('Reparto iguales en 3 locales cierra con el total', st.includes('Asignado $ 100,01 de $ 100,01') && st.includes('✓'), st.trim());
  check('Validar habilitado', await page.locator('#btn-validar').isEnabled());
  await shot('1440-detalle-png-reparto');
  await page.click('#btn-validar');
  await page.waitForSelector('.etapas-grid');
  check('Validar mueve a etapa 2 (Validado = 2)', (await cnt('validado')) === 2);

  // --- Detalle PDF: embed
  await page.click(`.etapa-card[data-id="${pdfId}"]`);
  await page.waitForSelector('.doc-stage');
  check('Detalle: PDF subido con <embed>', await page.locator('.doc-stage embed[type="application/pdf"][src^="blob:"]').count() === 1);
  await page.selectOption('#sel-local', 'local6');
  await page.click('#btn-validar');
  await page.waitForSelector('.etapas-grid');

  // --- Ejemplo 1 (bebidas): reparto por porcentaje que NO cierra
  const bebId = await page.evaluate(() => state.comps.find(c => c.proveedor === 'Bebidas del Plata S.A.').id);
  await page.click(`.etapa-card[data-id="${bebId}"]`);
  await page.click('[data-action="modo-local"][data-modo="varios"]');
  for (const l of ['pizzeria', 'parrilla1', 'parrilla2']) await page.check(`[data-local="${l}"]`);
  await page.click('[data-action="rep-tipo"][data-tipo="porcentaje"]');
  const inputs = page.locator('[data-input="rep-valor"]');
  await inputs.nth(0).fill('50'); await inputs.nth(1).fill('30'); await inputs.nth(2).fill('30');
  const stBad = await page.textContent('#rep-status');
  check('Reparto que no cierra: aviso rojo y Validar bloqueado', stBad.includes('⚠') && await page.locator('#btn-validar').isDisabled() && await page.locator('#rep-status .validacion.error').count() === 1, stBad.trim());
  await shot('1440-reparto-no-cierra');
  await inputs.nth(2).fill('20');
  check('Reparto 50/30/20 cierra → ✓', (await page.textContent('#rep-status')).includes('✓') && await page.locator('#btn-validar').isEnabled());
  // modo monto que no cierra
  await page.click('[data-action="rep-tipo"][data-tipo="monto"]');
  const mi = page.locator('[data-input="rep-valor"]');
  await mi.nth(0).fill('100.000,00'); await mi.nth(1).fill('100.000,00'); await mi.nth(2).fill('100.000,00');
  check('Modo monto que no cierra bloquea', await page.locator('#btn-validar').isDisabled());
  await page.click('[data-action="rep-tipo"][data-tipo="porcentaje"]');
  check('Vuelve a porcentaje y se puede validar', await page.locator('#btn-validar').isEnabled());
  await page.click('#btn-validar');
  await page.waitForSelector('.etapas-grid');

  // --- Ticket manuscrito: baja confianza
  const verId = await page.evaluate(() => state.comps.find(c => c.proveedor === 'Verdulería Don Pepe').id);
  await page.click(`.etapa-card[data-id="${verId}"]`);
  check('Ticket manuscrito: 3 campos resaltados en ámbar (total, fecha, CUIT)', await page.locator('.field.confianza-ambar').count() === 3);
  check('Mock manuscrito visible', await page.locator('.manuscrito').count() === 1);
  await shot('1440-detalle-baja-confianza');
  await page.fill('[data-field="fecha"]', '31/02/2026');
  check('Fecha inválida marcada y bloquea validar', await page.locator('.field.invalido').count() === 1 && await page.locator('#btn-validar').isDisabled());
  await page.fill('[data-field="fecha"]', '02/10/2026');
  check('Editar un campo de baja confianza lo marca como confirmado', await page.locator('[data-wrap="fecha"] .conf-tag.ok').count() === 1);
  await page.selectOption('#sel-local', 'pasta');
  await page.selectOption('[data-field="pagado"]', 'si');
  check('Pagado muestra selector de medio', await page.locator('[data-field="medio"]').count() === 1);
  await page.selectOption('[data-field="medio"]', 'Efectivo');
  await page.click('#btn-validar');
  await page.waitForSelector('.etapas-grid');

  // --- Ejemplo 3 (luz): local ya sugerido
  const luzId = await page.evaluate(() => state.comps.find(c => c.proveedor === 'Empresa Eléctrica del Litoral' && c.estado === 'pendiente').id);
  await page.click(`.etapa-card[data-id="${luzId}"]`);
  check('Factura de luz trae un solo local sugerido (Heladería)', (await page.inputValue('#sel-local')) === 'heladeria');
  await shot('1440-detalle-luz');
  await page.click('#btn-validar');
  await page.waitForSelector('.etapas-grid');

  // --- Duplicado
  const dupId = await page.evaluate(() => state.comps.find(c => c.proveedor.startsWith('Cervecería') && c.estado === 'pendiente').id);
  check('Tarjeta de duplicado con chip rojo', await page.locator(`.etapa-card[data-id="${dupId}"] .chip-rojo`).count() === 1);
  await page.click(`.etapa-card[data-id="${dupId}"]`);
  await page.waitForSelector('#dup-panel');
  const panel = await page.textContent('#dup-panel');
  check('Panel comparativo duplicado (nuevo vs ya registrado)', panel.includes('NUEVO') && panel.includes('YA REGISTRADO') && panel.includes('0002-00091277'));
  await page.selectOption('#sel-local', 'parrilla1');
  check('Con duplicado sin resolver no deja validar', await page.locator('#btn-validar').isDisabled());
  await shot('1440-duplicado');
  await page.click('text=Descartar duplicado');
  await page.waitForSelector('.etapas-grid');
  check('Descartar duplicado lo saca de la bandeja', await page.locator(`.etapa-card[data-id="${dupId}"]`).count() === 0);
  // segundo duplicado → "Es distinto"
  await page.click('.tab:has-text("Cargar")');
  await page.click('text=✨ Usar comprobantes de ejemplo');
  await page.waitForFunction(() => document.querySelectorAll('.carga-row .chip-verde').length === 10, null, { timeout: 8000 });
  await page.click('.tab:has-text("Bandeja")');
  const dup2 = await page.evaluate(() => state.comps.find(c => c.proveedor.startsWith('Cervecería') && c.estado === 'pendiente').id);
  await page.click(`.etapa-card[data-id="${dup2}"]`);
  await page.selectOption('#sel-local', 'parrilla2');
  await page.click('text=Es distinto, continuar');
  check('"Es distinto, continuar" habilita Validar', await page.locator('#btn-validar').isEnabled() && await page.locator('#dup-panel').count() === 0);
  await page.click('#btn-validar');
  await page.waitForSelector('.etapas-grid');

  // --- Registrar
  const nVal = await cnt('validado');
  await page.click('text=/Registrar validados \\(\\d+\\)/');
  check('"Registrar validados (n)" pasa todo a Registrado', (await cnt('validado')) === 0 && (await cnt('registrado')) === 8 + nVal, `n=${nVal}`);
  await shot('1440-bandeja-final');

  // Registrado = solo lectura
  await page.click('.tab:has-text("Comprobantes")');
  await page.waitForSelector('#tabla-comprobantes');
  const filas = await page.locator('#tabla-comprobantes tbody tr').count();
  check('Tabla muestra todos los registrados', filas === 8 + nVal, `${filas} filas`);
  await shot('1440-comprobantes');
  await page.click('#tabla-comprobantes tbody tr >> nth=0');
  await page.waitForSelector('.doc-stage');
  check('Detalle de registrado en solo lectura (inputs deshabilitados, sin acciones)', await page.locator('[data-field="proveedor"]:disabled').count() === 1 && await page.locator('#val-bar').count() === 0);
  await page.click('text=← Volver a Comprobantes');

  // --- Filtros
  await page.selectOption('[data-key="periodo"]', 'mes');
  const nMes = await page.locator('#tabla-comprobantes tbody tr').count();
  await page.selectOption('[data-key="periodo"]', 'anterior');
  const nAnt = await page.locator('#tabla-comprobantes tbody tr').count();
  await page.selectOption('[data-key="periodo"]', '7d');
  const n7 = await page.locator('#tabla-comprobantes tbody tr').count();
  await page.selectOption('[data-key="periodo"]', 'todo');
  check('Filtros de período distintos y coherentes', nMes > 0 && nAnt > 0 && nMes + nAnt === filas && n7 > 0 && n7 < filas, `mes=${nMes} ant=${nAnt} 7d=${n7} todo=${filas}`);
  await page.selectOption('[data-key="pago"]', 'no');
  check('Filtro estado de pago', await page.locator('#tabla-comprobantes tbody tr').count() > 0 && await page.locator('#tabla-comprobantes tbody tr:has-text("Pagado ·")').count() === 0);
  await page.selectOption('[data-key="pago"]', '');
  await page.fill('#inp-buscar', 'lácteos');
  await page.fill('#inp-buscar', '0003-00018234');
  check('Buscador por número (sin perder el foco)', await page.locator('#tabla-comprobantes tbody tr').count() === 1 && await page.evaluate(() => document.activeElement.id === 'inp-buscar'));
  await page.fill('#inp-buscar', '');
  await page.selectOption('[data-key="egreso"]', 'Alquileres');
  check('Filtro tipo de egreso', await page.locator('#tabla-comprobantes tbody tr').count() === 1);
  await page.selectOption('[data-key="egreso"]', '');

  // --- Excel (todo)
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-excel')]);
  const name = dl.suggestedFilename();
  check('Nombre del archivo comprobantes_2026-10-02.xlsx', name === 'comprobantes_2026-10-02.xlsx', name);
  await dl.saveAs(path.join(S, 'todo.xlsx'));
  // Excel filtrado por local
  await page.selectOption('[data-key="local"]', 'pizzeria');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#btn-excel')]);
  await dl2.saveAs(path.join(S, 'pizzeria.xlsx'));
  await page.selectOption('[data-key="local"]', '');
  check('Tarjeta "¿Qué se puede sumar después?" al pie', (await page.textContent('.futuro')).includes('Cierres de turno') && (await page.textContent('.futuro')).includes('Resultados por local'));
  check('Nota junto al botón Excel', (await page.textContent('.export-note')).includes('mismo formato que tu planilla actual'));
  fs.writeFileSync(path.join(S, 'ids.json'), JSON.stringify({ pngId, bebId }));
  const pngProv = await page.evaluate((id) => { const c = state.comps.find(x => x.id === id); return { prov: c.proveedor, num: c.numero, imps: c.imps }; }, pngId);
  fs.writeFileSync(path.join(S, 'png.json'), JSON.stringify(pngProv));

  // --- Reiniciar
  await page.click('[data-action="reset-demo"]');
  await page.waitForSelector('#dropzone', { timeout: 3000 }).catch(() => {});
  await page.click('.tab:has-text("Bandeja")');
  check('Reiniciar demo vuelve a la semilla (2/1/8)', (await cnt('pendiente')) === 2 && (await cnt('validado')) === 1 && (await cnt('registrado')) === 8);

  // --- Capturas mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('.tab:has-text("Cargar")');
  await page.click('text=✨ Usar comprobantes de ejemplo');
  await page.waitForFunction(() => document.querySelectorAll('.carga-row .chip-verde').length === 4, null, { timeout: 8000 });
  await shot('390-cargar');
  await page.click('.tab:has-text("Bandeja")'); await shot('390-bandeja');
  const v = await page.evaluate(() => state.comps.find(c => c.proveedor === 'Verdulería Don Pepe').id);
  await page.click(`.etapa-card[data-id="${v}"]`); await shot('390-detalle');
  await page.click('[data-action="modo-local"][data-modo="varios"]');
  await page.check('[data-local="pizzeria"]'); await page.check('[data-local="pasta"]'); await page.click('[data-action="rep-tipo"][data-tipo="porcentaje"]');
  await shot('390-detalle-reparto');
  await page.click('.tab:has-text("Comprobantes")'); await shot('390-comprobantes');
  const hs = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check('Sin scroll horizontal de página a 390 px', !hs);
  await page.setViewportSize({ width: 820, height: 1000 });
  await page.click('.tab:has-text("Bandeja")'); await shot('820-bandeja');
  check('Sin scroll horizontal de página a 820 px', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));

  check('Sin errores en consola', errors.length === 0, errors.join(' | '));
  fs.writeFileSync(path.join(S, 'results.json'), JSON.stringify(results, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
