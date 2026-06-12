import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(test);

Given('se encuentra en el módulo de costos', async ({ finanzasPage }) => {
  await finanzasPage.page.goto('/finanzas.html');
});

When('completa correctamente los campos concepto, proveedor, moneda, monto y tratamiento de IGV:', async ({ finanzasPage }, dataTable) => {
  await finanzasPage.tabCostosBtn.click();
  finanzasPage.page.on('dialog', async dialog => {
    console.error('DIALOG EN COSTOS:', dialog.message());
    await dialog.accept();
  });
  const data = dataTable.rowsHash();
  await finanzasPage.btnNuevoCosto.click();

  if (data['Concepto']) await finanzasPage.cosConcepto.selectOption({ label: data['Concepto'] });
  if (data['Proveedor / beneficiario']) await finanzasPage.cosProveedor.fill(data['Proveedor / beneficiario']);
  if (data['Moneda']) await finanzasPage.cosMoneda.selectOption(data['Moneda']);
  if (data['Monto']) await finanzasPage.cosMonto.fill(data['Monto']);

  if (data['Tratamiento de IGV']) {
    let val = 'sin_igv';
    if (data['Tratamiento de IGV'] === 'Ya incluye IGV') val = 'con_igv';
    else if (data['Tratamiento de IGV'] === 'Exento de IGV') val = 'exento';
    await finanzasPage.cosIgvModo.selectOption(val);
  }

  if (data['Número de comprobante']) await finanzasPage.cosComprobante.fill(data['Número de comprobante']);
});

When('selecciona Guardar costo', async ({ finanzasPage }) => {
  await finanzasPage.btnGuardarCosto.click();
  await finanzasPage.page.waitForTimeout(1000);
});

Then('el sistema registra el costo exitosamente', async ({ finanzasPage }) => {
  await finanzasPage.page.waitForTimeout(1500); // Give time for reload
  const tableRows = finanzasPage.tabContent.locator('table tbody tr');
  await expect(tableRows.first()).toBeVisible({ timeout: 5000 });
});

Then('actualiza el total de costos de la orden', async ({ finanzasPage }) => {
  await expect(finanzasPage.kpiCostos).not.toBeEmpty();
  const text = await finanzasPage.kpiCostos.innerText();
  expect(text).toContain('$');
  expect(parseFloat(text.replace('$', '').trim())).toBeGreaterThan(0);
});

When('completa el formulario con un monto positivo mínimo:', async ({ finanzasPage }, dataTable) => {
  await finanzasPage.tabCostosBtn.click();
  finanzasPage.page.on('dialog', async dialog => {
    console.error('DIALOG EN COSTOS 2:', dialog.message());
    await dialog.accept();
  });
  const data = dataTable.rowsHash();
  await finanzasPage.btnNuevoCosto.click();

  if (data['Concepto']) await finanzasPage.cosConcepto.selectOption({ label: data['Concepto'] });
  if (data['Proveedor / beneficiario']) await finanzasPage.cosProveedor.fill(data['Proveedor / beneficiario']);
  if (data['Moneda']) await finanzasPage.cosMoneda.selectOption(data['Moneda']);
  if (data['Monto']) await finanzasPage.cosMonto.fill(data['Monto']);

  if (data['Tratamiento de IGV']) {
    let val = 'sin_igv';
    if (data['Tratamiento de IGV'] === 'Ya incluye IGV') val = 'con_igv';
    else if (data['Tratamiento de IGV'] === 'Exento de IGV') val = 'exento';
    await finanzasPage.cosIgvModo.selectOption(val);
  }
});

When('deja vacío el número de comprobante', async ({ finanzasPage }) => {
  await finanzasPage.cosComprobante.fill('');
});
