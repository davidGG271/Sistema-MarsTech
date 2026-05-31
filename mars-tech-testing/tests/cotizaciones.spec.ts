import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { SidebarMenu } from '../pages/SidebarMenu';
import { CotizacionesPage } from '../pages/CotizacionesPage';

test.describe('US-04: Gestión de Cotizaciones', () => {
  let loginPage: LoginPage;
  let sidebar: SidebarMenu;
  let cotizacionesPage: CotizacionesPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    sidebar = new SidebarMenu(page);
    cotizacionesPage = new CotizacionesPage(page);

    await loginPage.goto();
    await loginPage.login('henryhuaman52@gmail.com', 'henry123'); 
    
    await page.waitForURL('**/dashboard*');
    
    // Navegar a ventas (asumiendo que está en el sidebar)
    await page.locator('a[href="ventas.html"]').click();
    await page.waitForURL('**/ventas*');
  });

  test('COT-INT-019: Registrar cotización con cliente activo y datos válidos estándar', async ({ page }) => {
    await cotizacionesPage.abrirNuevaCotizacion();

    // Llenar datos generales
    await cotizacionesPage.llenarFormularioGeneral({
      // Usamos el cliente modificado en UAT-007 en vez del original, ya que corren en secuencia
      cliente: 'Translog Perú Cargo SAC', 
      moneda: 'USD',
      validez: '2026-06-30',
      lugar: 'Callao, Lima, Perú',
      tiempo: '20 días hábiles',
      observaciones: 'Servicio marítimo regular',
      condiciones: 'Pago 50% adelanto y 50% contra entrega'
    });

    // Agregar ítem
    await cotizacionesPage.agregarItem({
      concepto: 'Almacenaje depósito',
      descripcion: 'Transporte internacional marítimo',
      cantidad: '2',
      precio: '1500.00'
    });

    // Guardar
    await cotizacionesPage.guardarCotizacion();
  });

  test('COT-INT-020: Registrar cotización con valores mínimos válidos', async ({ page }) => {
    await cotizacionesPage.abrirNuevaCotizacion();

    await cotizacionesPage.llenarFormularioGeneral({
      cliente: 'Andina Cargo SAC',
      moneda: 'PEN',
      validez: '2026-05-26',
      lugar: 'Lima',
      tiempo: '1 día hábil',
      observaciones: 'vacío',
      condiciones: 'vacío'
    });

    await cotizacionesPage.agregarItem({
      concepto: 'Almacenaje depósito',
      descripcion: 'Flete',
      cantidad: '1',
      precio: '0.01'
    });

    await cotizacionesPage.guardarCotizacion();
  });

  test('COT-INT-021: Registrar cotización con valores máximos válidos', async ({ page }) => {
    await cotizacionesPage.abrirNuevaCotizacion();

    await cotizacionesPage.llenarFormularioGeneral({
      cliente: 'Exportaciones Lima SAC',
      moneda: 'USD',
      validez: '2026-12-31',
      lugar: 'texto válido de ubicación extensa permitida',
      tiempo: '90 días hábiles',
      observaciones: 'texto permitido sin HTML ni scripts',
      condiciones: 'texto comercial válido relacionado con pagos y notas adicionales'
    });

    await cotizacionesPage.agregarItem({
      concepto: 'Almacenaje depósito',
      descripcion: 'texto válido de 255 caracteres',
      cantidad: '1000000',
      precio: '999999.99'
    });

    await cotizacionesPage.guardarCotizacion();
  });
});

test.describe('US-05: Aprobación de Cotizaciones', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('henryhuaman52@gmail.com', 'henry123'); 
    await page.waitForURL('**/dashboard*');
    await page.locator('a[href="ventas.html"]').click();
    await page.waitForURL('**/ventas*');
  });

  test('COT-UAT-026: Aprobar cotización enviada', async ({ page }) => {
    // 1. Filtrar por estado "enviada"
    await page.locator('#filtro-estado').selectOption({ value: 'enviada' });
    await page.waitForTimeout(1000);

    // 2. Localizar el botón Aprobar de la primera fila disponible
    const btnAprobar = page.locator('.btn-aprobar').first();
    await expect(btnAprobar).toBeVisible({ timeout: 5000 });
    
    // 3. Hacer clic en Aprobar
    await btnAprobar.click();

    // 4. Esperar el modal de confirmación
    const modalEstado = page.locator('#modal-estado');
    await expect(modalEstado).toHaveClass(/visible/);

    // NOTA: El CA indica ingresar una "Observación", pero la UI actual
    // solicita seleccionar un "Tipo de Orden" (SEA, AIR, etc). 
    // Seleccionamos la opción "SEA".
    await modalEstado.locator('input[value="SEA"]').click();

    // 5. Manejar el alert nativo de éxito al crear la orden
    let alertMessage = '';
    page.once('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // 6. Confirmar
    await page.locator('#modal-estado-confirmar').click();

    // 7. Validar que el modal se cierra y la alerta fue mostrada
    await expect(modalEstado).not.toHaveClass(/visible/, { timeout: 10000 });
    expect(alertMessage).toContain('creada exitosamente');
  });
});

test.describe('US-06: Búsqueda de Cotizaciones', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('henryhuaman52@gmail.com', 'henry123'); 
    await page.waitForURL('**/dashboard*');
    await page.locator('a[href="ventas.html"]').click();
    await page.waitForURL('**/ventas*');
  });

  test('COT-UAT-032: Buscar cotización por código de cotización existente', async ({ page }) => {
    // Ingresar código en la barra de búsqueda
    await page.locator('#filtro-busqueda').fill('COT-260001');
    await page.waitForTimeout(1000); // Esperar filtrado dinámico

    // Validar que se muestre en los resultados (dentro de la tabla)
    await expect(page.locator('#tbody-cotizaciones').locator('text=COT-260001').first()).toBeVisible();
  });

  test('COT-UAT-033: Buscar cotización sin distinguir mayúsculas y minúsculas', async ({ page }) => {
    // Buscar el cliente en minúsculas
    await page.locator('#filtro-busqueda').fill('translog perú cargo sac');
    await page.waitForTimeout(1000);

    // Validar que encuentre las cotizaciones de ese cliente ignorando el case (dentro de la tabla)
    await expect(page.locator('#tbody-cotizaciones').locator('text=Translog Perú Cargo SAC').first()).toBeVisible();
  });
});
