import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

Given('se encuentra en la vista de ventas', async ({ page, sidebarMenu }) => {
  await sidebarMenu.page.locator('a[href="ventas.html"]').click();
  await page.waitForURL('**/ventas*');
  // Esperar a que se carguen las cotizaciones desde supabase
  await page.waitForResponse(res => res.url().includes('cotizaciones') && res.request().method() === 'GET').catch(() => {});
  await page.waitForTimeout(1000); // Dar un poco de tiempo extra para renderizar
});

When('el usuario abre el modal de nueva cotización', async ({ page, cotizacionesPage }) => {
  // Add a small wait or wait for network idle to ensure Supabase loads conceptosCatalogo before clicking
  await page.waitForTimeout(1500); 
  await cotizacionesPage.abrirNuevaCotizacion();
});

When('llena el formulario de cotización con los siguientes datos generales:', async ({ cotizacionesPage }, dataTable) => {
  const data = dataTable.rowsHash();
  await cotizacionesPage.llenarFormularioGeneral({
    cliente: data.cliente,
    moneda: data.moneda,
    validez: data.validez,
    lugar: data.lugar,
    tiempo: data.tiempo,
    observaciones: data.observaciones,
    condiciones: data.condiciones,
  });
});

When('agrega un ítem a la cotización con los siguientes datos:', async ({ cotizacionesPage }, dataTable) => {
  const data = dataTable.rowsHash();
  await cotizacionesPage.agregarItem({
    concepto: data.concepto,
    descripcion: data.descripcion,
    cantidad: data.cantidad,
    precio: data.precio,
  });
});

When('guarda la cotización', async ({ page, cotizacionesPage }) => {
  page.on('dialog', async dialog => {
    await dialog.accept().catch(() => {});
  });
  await cotizacionesPage.guardarCotizacion();
});

Then('el modal de cotización se cierra exitosamente', async ({ cotizacionesPage }) => {
  await expect(cotizacionesPage.modalCotizacion).not.toHaveClass(/visible/, { timeout: 10000 });
});

When('filtra las cotizaciones por el estado {string}', async ({ page }, estado: string) => {
  await page.locator('#filtro-estado').selectOption({ value: estado });
  await page.waitForTimeout(1000);
});

When('hace clic en Aprobar en la primera cotización', async ({ page }) => {
  const btnAprobar = page.locator('.btn-aprobar').first();
  await expect(btnAprobar).toBeVisible({ timeout: 5000 });
  await btnAprobar.click();
});

When('hace clic en Enviar en la primera cotización', async ({ page }) => {
  const btnEnviar = page.locator('.btn-enviar').first();
  await expect(btnEnviar).toBeVisible({ timeout: 5000 });
  await btnEnviar.click();
});

When('selecciona {string} como tipo de orden a generar en el modal de estado', async ({ page }, tipo: string) => {
  const modalEstado = page.locator('#modal-estado');
  await expect(modalEstado).toHaveClass(/visible/);
  await modalEstado.locator(`input[value="${tipo}"]`).click();
});

When('confirma el cambio de estado', async ({ page }) => {
  // Manejamos el alert globalmente aquí para capturar su mensaje en el test object
  test.info().annotations.push({ type: 'alertMessage', description: '' });
  page.once('dialog', async dialog => {
    test.info().annotations[test.info().annotations.length - 1].description = dialog.message();
    await dialog.accept().catch(() => {});
  });

  const btnConfirmar = page.locator('#modal-estado-confirmar');
  await expect(btnConfirmar).toBeVisible({ timeout: 5000 });
  await btnConfirmar.click();
});

Then('el modal de estado se cierra', async ({ page }) => {
  const modalEstado = page.locator('#modal-estado');
  await expect(modalEstado).not.toHaveClass(/visible/, { timeout: 10000 });
});

Then('se muestra un mensaje de alerta indicando {string}', async ({ page }, textoEsperado: string) => {
  const alerts = test.info().annotations.filter(a => a.type === 'alertMessage');
  const alertMsg = alerts.length > 0 ? alerts[alerts.length - 1].description : '';
  expect(alertMsg).toContain(textoEsperado);
});

When('busca la cotización {string}', async ({ page }, termino: string) => {
  await page.locator('#filtro-busqueda').fill(termino);
  await page.waitForTimeout(1000); // Esperar filtrado dinámico
});

Then('se muestra el código {string} en la lista de resultados de cotizaciones', async ({ page }, codigo: string) => {
  await expect(page.locator('#tbody-cotizaciones').locator(`text=${codigo}`).first()).toBeVisible();
});

Then('se muestra el cliente {string} en la lista de resultados de cotizaciones', async ({ page }, cliente: string) => {
  await expect(page.locator('#tbody-cotizaciones').locator(`text=${cliente}`).first()).toBeVisible();
});
