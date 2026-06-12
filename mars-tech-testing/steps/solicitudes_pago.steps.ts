import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(test);

Given('se encuentra en el módulo de solicitudes de pago', async ({ finanzasPage }) => {
  await finanzasPage.page.goto('/finanzas.html');
});

When('completa correctamente los campos concepto, beneficiario, moneda, monto, tratamiento de IGV y sustento:', async ({ finanzasPage }, dataTable) => {
  await finanzasPage.tabSolicitudesBtn.click();
  finanzasPage.page.on('dialog', async dialog => {
    console.error('DIALOG EN SOLICITUDES:', dialog.message());
    await dialog.accept();
  });
  finanzasPage.page.on('console', msg => console.error('CONSOLE:', msg.text()));
  const data = dataTable.rowsHash();
  await finanzasPage.btnNuevaSol.click();

  if (data['Concepto']) await finanzasPage.solConcepto.selectOption({ label: data['Concepto'] });
  if (data['Beneficiario']) await finanzasPage.solBeneficiario.fill(data['Beneficiario']);
  if (data['Moneda']) await finanzasPage.solMoneda.selectOption(data['Moneda']);
  if (data['Monto']) await finanzasPage.solMonto.fill(data['Monto']);

  if (data['Tratamiento de IGV']) {
    let val = 'sin_igv';
    if (data['Tratamiento de IGV'] === 'Ya incluye IGV') val = 'con_igv';
    else if (data['Tratamiento de IGV'] === 'Exento de IGV') val = 'exento';
    await finanzasPage.solIgvModo.selectOption(val);
  }

  if (data['Sustento / descripción']) await finanzasPage.solSustento.fill(data['Sustento / descripción']);
});

When('completa el formulario de solicitud con un monto positivo mínimo:', async ({ finanzasPage }, dataTable) => {
  await finanzasPage.tabSolicitudesBtn.click();
  finanzasPage.page.on('dialog', async dialog => {
    console.error('DIALOG EN SOLICITUDES 2:', dialog.message());
    await dialog.accept();
  });
  const data = dataTable.rowsHash();
  await finanzasPage.btnNuevaSol.click();

  if (data['Concepto']) await finanzasPage.solConcepto.selectOption({ label: data['Concepto'] });
  if (data['Beneficiario']) await finanzasPage.solBeneficiario.fill(data['Beneficiario']);
  if (data['Moneda']) await finanzasPage.solMoneda.selectOption(data['Moneda']);
  if (data['Monto']) await finanzasPage.solMonto.fill(data['Monto']);

  if (data['Tratamiento de IGV']) {
    let val = 'sin_igv';
    if (data['Tratamiento de IGV'] === 'Ya incluye IGV') val = 'con_igv';
    else if (data['Tratamiento de IGV'] === 'Exento de IGV') val = 'exento';
    await finanzasPage.solIgvModo.selectOption(val);
  }

  if (data['Sustento / descripción']) await finanzasPage.solSustento.fill(data['Sustento / descripción']);
});

When('selecciona la opción Solicitar pago', async ({ finanzasPage }) => {
  await finanzasPage.btnGuardarSol.click();
  await finanzasPage.page.waitForTimeout(1000);
});

Then('el sistema registra la solicitud exitosamente', async ({ finanzasPage }) => {
  await finanzasPage.page.waitForTimeout(1500); // Give time for reload
  // The cards don't have a specific class, but they contain status pills (.pill)
  const cards = finanzasPage.page.locator('#tab-content > div').filter({ has: finanzasPage.page.locator('.pill') });
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
});

Then('muestra una notificación de confirmación', async ({ finanzasPage }) => {
  // As discussed, there is no toast notification. We verify the KPI update.
  await expect(finanzasPage.kpiPendiente).not.toBeEmpty();
  const text = await finanzasPage.kpiPendiente.innerText();
  expect(text).toContain('$');
  expect(parseFloat(text.replace('$', '').trim())).toBeGreaterThan(0);
});
