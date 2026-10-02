# Checklist · Demo mínima (`demo-minimo/index.html`)

Verificado con Playwright (Chromium) a 1440 px, 820 px y 390 px: `pruebas/test.js` (49 comprobaciones automáticas, 0 fallidas, 0 errores de consola). El `.xlsx` descargado se abrió con openpyxl. Capturas en `capturas/`.

**Nota de entorno:** en la sandbox donde se probó, las CDN (jsdelivr, cdnjs) están bloqueadas. Para la prueba se sirvió SheetJS 0.18.5 desde una copia local (`page.route`) en la misma URL de jsdelivr que usa el HTML. El HTML carga SheetJS, y las tipografías, solo desde CDN. Falta probarlo abriéndolo en un navegador con internet.

## Reglas generales
| | Punto | Nota |
|---|---|---|
| ✓ | Un solo HTML autocontenido, sin build, abre con doble clic | `demo-minimo/index.html`. `demo/index.html` no se tocó (no está en el repo, solo se leyó). |
| ✓ | Librerías solo de jsdelivr / cdnjs | SheetJS `xlsx@0.18.5` (jsdelivr). Fuentes de Google Fonts, igual que la demo completa. |
| ✓ | Estado en memoria, "Reiniciar demo", sin localStorage | Reiniciar vuelve a la semilla 2/1/8 (probado). |
| ✓ | Voseo rioplatense, montos `$ 1.234.567,89`, fechas dd/mm/aaaa, hoy = 02/10/2026 | Formateador propio (no depende del locale del navegador). |
| ✓ | Datos ficticios, sin nada de `referencias/` | |
| ✓ | Carga real de archivos, lectura simulada | `<input type="file" multiple accept="image/*,application/pdf">` + drag & drop. |
| ✓ | Identidad visual reutilizada | Variables CSS, Inter, chips, tarjetas, toasts, animación `ia-scan`, columnas de etapas y patrón `ACTIONS` / `CHANGE_HANDLERS` / `render()`. |
| ✓ | Responsive 1280+, tablet y celular | Sin scroll horizontal de página a 820 y 390 px. La tabla de Comprobantes scrollea dentro de su tarjeta. |

## Estructura
| | Punto | Nota |
|---|---|---|
| ✓ | Barra superior: marca, 3 pestañas, contador en Bandeja, reiniciar | El contador cuenta pendientes + validados (lo que falta registrar). A 390 px el botón queda como "↺" para que entre la marca. |
| ✓ | Pie "Prototipo — Anavic AI" | |
| ✓ | Los 6 locales | Sin sociedades. |

## Pantalla 1 · Cargar
| | Punto | Nota |
|---|---|---|
| ✓ | Zona de carga con el texto pedido, drag & drop e input real múltiple | Probado con `setInputFiles` de PNG + PDF. |
| ✓ | "Usar comprobantes de ejemplo" carga 4 casos | Bebidas limpia · ticket manuscrito con 3 campos ámbar (total, fecha y CUIT; pedías dos) · luz de Heladería · duplicado. |
| ✓ | Fila por archivo: nombre, miniatura, "Leyendo con IA…" 1,5–2 s → "Listo · enviado a la bandeja" | Miniatura real (`blob:`) para imágenes, ícono PDF para PDF. |
| ✓ | Aviso "N comprobantes en la bandeja para revisar" + "Ir a la bandeja" | |
| ✓ | Cómo funciona, tres pasos con íconos | |
| ✓ | Archivos que no son imagen ni PDF | Se ignoran con aviso. |

## Pantalla 2 · Bandeja
| | Punto | Nota |
|---|---|---|
| ✓ | Franja del circuito | |
| ✓ | 3 columnas: número, título, descripción, contador, borde de color, fondo tintado, divisores verticales, flechas | A ≤1000 px se apilan. |
| ✓ | Tarjeta: proveedor, tipo y número, fecha, total, chips de locales, "⚠ Posible duplicado", "Revisar lectura" | |
| ✓ | Semilla: 2 Pendiente, 1 Validado, 8 Registrado | |
| ✓ | "Registrar validados (n)" en el encabezado de Validado | |
| ✓ | Acciones por etapa: Validar/Descartar, Registrar/Devolver, Registrado solo lectura | |

## Detalle de un comprobante
| | Punto | Nota |
|---|---|---|
| ✓ | Imagen subida se muestra de verdad | `URL.createObjectURL`; se comprobó `naturalWidth > 0`. |
| ✓ | PDF con `<embed>` | La sandbox no renderiza el visor de PDF. Se comprobó el elemento y su `src` `blob:`, no el dibujo del visor. |
| ✓ | Mock de factura / ticket / manuscrito para los ejemplos | |
| ✓ | Campos editables con indicador de confianza; baja confianza en ámbar | Al editar un campo ámbar pasa a "✓ Confirmado". |
| ✓ | Todos los campos pedidos (proveedor, CUIT, tipo, número, fecha, total, egreso, subtipo, costo, pago + medio, observación) | Fecha con validación dd/mm/aaaa (31/02 la rechaza y bloquea). |
| ✓ | "¿A qué restaurante corresponde?" obligatorio | Un local (selector) o repartir entre varios (mínimo 2). |
| ✓ | Reparto: partes iguales, porcentaje, monto + "Asignado $ X de $ Y ✓" | Si no cierra, el botón Validar queda deshabilitado y el texto dice qué falta. |
| ✓ | Aviso de duplicado con panel comparativo y acciones | "Descartar duplicado" lo saca de la bandeja. "Es distinto, continuar" habilita Validar. Con el duplicado sin resolver no se puede validar. |
| ✓ | Edición sin perder el foco | Los campos de texto actualizan sin re-renderizar toda la pantalla. |

## Pantalla 3 · Comprobantes
| | Punto | Nota |
|---|---|---|
| ✓ | Tabla con todas las columnas pedidas | |
| ✓ | Clic en fila → detalle solo lectura con el documento | Inputs deshabilitados, sin acciones. |
| ✓ | Filtros: período, local, tipo de egreso, proveedor, estado de pago + buscador | Período por defecto: "Todo". El buscador no pierde el foco. |
| ✓ | Cantidad y total del filtro | Con filtro de local, el total es lo imputado a ese local. |
| ✓ | "⬇ Descargar Excel" real con SheetJS, respeta filtros | Con filtro de local, "Detalle por local" trae solo las filas de ese local. |
| ✓ | Nombre `comprobantes_2026-10-02.xlsx` | |
| ✓ | Hoja "Detalle por local" con las 10 columnas en orden | Tipo de Pago = medio o "No Pagado". |
| ✓ | Hoja "Comprobantes" con todos los campos y el total | Una fila por comprobante (14 columnas), sin fila de totales. |
| ✓ | Importes como número, fechas como fecha, anchos ajustados | openpyxl: fechas `datetime` con formato `dd/mm/yyyy`, importes numéricos `#,##0.00`. |
| ✓ | Comprobante repartido en 3 locales → 3 filas que suman el total | $ 100,01 repartido en 33,34 + 33,34 + 33,33. Bebidas del Plata (50/30/20) también 3 filas. La suma de cada comprobante en "Detalle por local" coincide con su total en "Comprobantes". |
| ✓ | Nota junto al botón | |
| ✓ | Tarjeta "¿Qué se puede sumar después?" al pie | Sin enlaces ni funcionalidad. |

## Casos pedidos
| | Caso | Nota |
|---|---|---|
| ✓ | Subir PNG y PDF y recorrer cargar → validar → registrar → tabla → Excel | `pruebas/test.js` |
| ✓ | Duplicado | Descartar y "Es distinto" probados. |
| ✓ | Reparto que no cierra | Porcentaje (50/30/30 = 110%) y monto. |
| ✓ | Sin errores en consola | |
| ✓ | Capturas a 1440 y 390 px, revisadas | Se corrigió el desalineado de "Cómo funciona", la barra superior y el selector de local en celular. |

## Qué NO se incluyó (según lo pedido)
App del encargado, cierres, caja, cuentas a pagar, resultados, roles, sociedades como filtro, reparto por ítem, alertas. No se lo llama CRM.

## Límites a tener en cuenta
- La lectura con IA es simulada. Los archivos subidos reciben datos ficticios determinísticos según nombre y tamaño.
- No se probó el dibujo del visor de PDF ni las fuentes de Google Fonts (sandbox sin acceso a esos hosts). La tipografía manuscrita del ejemplo cae a `cursive` si no carga.
- `window.confirm` en "Reiniciar demo", igual que la demo completa.
