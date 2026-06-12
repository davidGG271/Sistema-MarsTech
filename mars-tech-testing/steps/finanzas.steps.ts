import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(test);

Given('se encuentra en la página de Finanzas', async ({ page }) => {
  await page.goto('/finanzas.html');
});

Given('ha seleccionado la orden operativa {string}', async ({ finanzasPage }, orderNumber: string) => {
  // First, we need to click the sidebar to load the order
  // Wait for the selector to have options
  await finanzasPage.page.waitForTimeout(1000); // Give time for orders to load from DB
  const options = await finanzasPage.orderSelector.locator('option').allInnerTexts();
  const targetOption = options.find(o => o.includes(orderNumber));
  if (targetOption) {
    await finanzasPage.orderSelector.selectOption({ label: targetOption });
  } else {
    throw new Error(`Order ${orderNumber} not found in dropdown`);
  }
  await finanzasPage.page.waitForTimeout(500);
});

Given('posee permisos para registrar comprobantes', async () => {
  // Assumed true by login
});

When('registra un comprobante con los siguientes datos:', async ({ finanzasPage }, dataTable) => {
  const data = dataTable.rowsHash();
  await finanzasPage.newIncomeBtn.click();
  
  if (data['Tipo de comprobante']) await finanzasPage.typeDropdown.selectOption({ label: data['Tipo de comprobante'] });
  if (data['Serie / número']) await finanzasPage.serieInput.fill(data['Serie / número']);
  
  // For 'Concepto', we need to wait for the dropdown to populate and select by label
  if (data['Concepto']) {
    await finanzasPage.conceptDropdown.selectOption({ label: data['Concepto'] });
  }

  if (data['Moneda']) await finanzasPage.currencyDropdown.selectOption(data['Moneda']);
  if (data['Monto']) await finanzasPage.amountInput.fill(data['Monto']);
  
  // Tratamiento de IGV:
  if (data['Tratamiento de IGV']) {
    let val = 'sin_igv';
    if (data['Tratamiento de IGV'] === 'Ya incluye IGV') val = 'con_igv';
    else if (data['Tratamiento de IGV'] === 'Exento de IGV') val = 'exento';
    await finanzasPage.igvDropdown.selectOption(val);
  }

  if (data['Vencimiento']) await finanzasPage.dueDateInput.fill(data['Vencimiento']);
  
  if (data['Estado de pago']) {
    const val = data['Estado de pago'].toLowerCase();
    await finanzasPage.statusDropdown.selectOption(val);
  }
});

When('selecciona Guardar comprobante', async ({ finanzasPage }) => {
  finanzasPage.page.once('dialog', dialog => {
    finanzasPage.page.evaluate((msg) => {
      (window as any).__lastDialogMsg = msg;
    }, dialog.message());
    dialog.dismiss().catch(() => {});
  });
  await finanzasPage.saveBtn.click();
  // Wait for the toast or response
  await finanzasPage.page.waitForTimeout(1000);
});

Then('el sistema registra el comprobante exitosamente', async ({ finanzasPage }) => {
  // Wait for the table to contain the new row by waiting for the page to reload the panel
  await finanzasPage.page.waitForTimeout(1500); // Give time for reload
  const tableRows = finanzasPage.tabContent.locator('table tbody tr');
  await expect(tableRows.first()).toBeVisible({ timeout: 5000 });
});

Then('actualiza el total de ingresos de la orden', async ({ finanzasPage }) => {
  await expect(finanzasPage.kpiIngresos).not.toBeEmpty();
  const text = await finanzasPage.kpiIngresos.innerText();
  expect(text).toContain('$');
  expect(parseFloat(text.replace('$', '').trim())).toBeGreaterThan(0);
});

Then('el sistema muestra un mensaje de error indicando que el monto es obligatorio', async ({ finanzasPage }) => {
  const msg = await finanzasPage.page.evaluate(() => (window as any).__lastDialogMsg);
  expect(msg).toBeTruthy();
  expect(msg.toLowerCase()).toContain('monto');
});

Then('no registra el comprobante en el sistema', async ({ finanzasPage }) => {
  const tableText = await finanzasPage.tabContent.innerText();
  expect(tableText).not.toContain('F001-000124');
});
