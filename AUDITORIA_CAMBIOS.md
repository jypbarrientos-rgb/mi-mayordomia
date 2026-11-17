# Auditoría de cambios — Mi Mayordomía 3.0

Fecha de implementación: 2026-11-17

## Alcance

Modernización de la aplicación estática existente, manteniendo HTML, CSS, JavaScript sin framework, LocalStorage y Chart.js. La aplicación sigue siendo desplegable como sitio estático en GitHub Pages.

## Archivos

### `index.html`

- Reemplaza el marcado anterior, que tenía estilos y scripts inline y una estructura HTML incompleta.
- Define navegación, dashboard, formularios, presupuesto por categorías, metas, fondo de emergencia e historial.
- Añade metadatos de descripción y color de tema, enlaces a `style.css` y `app.js`, y carga Chart.js desde CDN.
- Incluye controles accesibles: etiquetas, estados, textos alternativos de gráficos y botones para el menú móvil.

### `style.css`

- Añade el sistema visual responsive para escritorio y móvil.
- Implementa navegación lateral colapsable con fondo de cierre y botón explícito para cerrar.
- Define tarjetas KPI, formularios, presupuestos, metas, historial, leyendas y estados vacíos.
- Respeta `prefers-reduced-motion` y evita desbordamiento horizontal en el ancho móvil probado.

### `app.js`

- Agrupa el comportamiento dentro de una función aislada y usa `const`/`let` en modo estricto.
- Conserva la clave de LocalStorage `movimientos`. Migra movimientos previos sin fecha/categoría asignándoles fecha actual y categoría `Otros` para gastos.
- Añade persistencia independiente para metas (`metas`), presupuestos (`presupuestos`) y ahorro del fondo (`fondoEmergencia`).
- Calcula saldo, ingresos, gastos, ahorro neto y diezmo sugerido (10% de ingresos) con los movimientos del mes actual.
- Permite registrar y eliminar ingresos y gastos; los gastos tienen categoría y fecha.
- Presenta historial ordenado por fecha, con todos los movimientos guardados.
- Permite múltiples metas, aportes, barras de progreso y eliminación.
- Calcula la meta sugerida del fondo como la suma de gastos de los tres meses calendario recientes; el ahorro acumulado se ingresa/actualiza manualmente.
- Permite guardar límites mensuales por categoría y comparar el gasto del mes. Un límite vacío equivale a “sin límite”.
- Añade gráficos de ingresos versus gastos y gastos por categoría.
- Valida entradas, valida fechas de calendario y escapa texto antes de renderizarlo en HTML.
- Informa fallos de lectura/escritura de LocalStorage y ofrece un mensaje alternativo si Chart.js no carga.

## Categorías de gasto

Alimentación, Transporte, Vivienda, Salud, Educación, Entretenimiento, Diezmo, Ofrendas y Otros.

## Verificaciones realizadas

### Comprobaciones estáticas

- `node --check app.js` — correcto.
- `git diff --check` — correcto.

No hay un manifiesto de paquetes, runner de pruebas ni comando de build configurado para esta aplicación estática; por eso no se ejecutó una suite de build/test del proyecto.

### Pruebas funcionales en navegador

Se abrió `index.html` localmente y se comprobaron estos flujos:

1. Registrar ingreso de `$1.000` y gasto de `$100` en Alimentación: KPI muestra ingreso `$1.000`, gasto `$100` y diezmo sugerido `$100`.
2. Con ese gasto, la meta sugerida del fondo de emergencia se calculó como `$100`.
3. Guardar presupuesto de `$200` para Alimentación: muestra `$100 / $200` y 50%.
4. Crear meta de `$200` y aportar `$50`: persiste y muestra 25%.
5. Registrar `$50` como ahorro del fondo: persiste y muestra 50% de avance.
6. Recargar la página: movimientos, presupuesto, meta y fondo permanecen guardados.
7. Eliminar movimientos: se actualizan historial, KPI y gastos por categoría.
8. A 390 px de ancho, el menú lateral abre/cierra y `scrollWidth` coincide con `clientWidth` (sin desbordamiento horizontal).
9. Cargar un movimiento antiguo con `tipo`, `descripcion` y `monto`, sin fecha: aparece con la fecha actual y se conserva en los totales.

Los datos creados para la prueba se retiraron de las cuatro claves de LocalStorage usadas por la app y se recargó el navegador; el estado final de prueba quedó vacío.

## Preparación para PWA y límites

- La separación de archivos, el metadato `theme-color` y la estructura estática dejan una base compatible con una futura PWA.
- Esta entrega **no** incluye `manifest.json`, service worker, caché offline, instalación ni sincronización en la nube.
- Chart.js y las fuentes tipográficas se cargan desde CDN; el resto de la aplicación es estático. Sin conexión, los gráficos pueden no estar disponibles.
- La validación visual/funcional se hizo con `file://`; no se ejecutó un despliegue real en GitHub Pages.

## Estado del repositorio

Al iniciar el trabajo, `index.html` ya aparecía modificado en el árbol de trabajo; su contenido se leyó y luego se sustituyó como parte de esta modernización. Al terminar, los cambios de implementación están en `index.html`, `style.css` y `app.js`; esta bitácora es un cuarto archivo añadido para facilitar la revisión.

No se creó ningún commit.
