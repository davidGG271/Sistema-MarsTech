import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(test);

Given('se encuentra en el módulo de Hitos', async ({ page, sidebarMenu }) => {
  await sidebarMenu.page.locator('a[href="hitos.html"]').click();
  await page.waitForURL('**/hitos*');
  // Wait for orders to load from Supabase
  await page.waitForResponse(res => res.url().includes('ordenes') && res.request().method() === 'GET').catch(() => {});
  await page.waitForTimeout(1000);
});

When('ingresa el código {string} en el buscador', async ({ hitosPage }, codigo: string) => {
  await hitosPage.searchOrder(codigo);
});

When('selecciona la orden {string}', async ({ hitosPage }, orden: string) => {
  await hitosPage.selectOrderByName(orden);
});

Then('el sistema carga la trazabilidad correspondiente a {string}', async ({ hitosPage }, orden: string) => {
  await expect(hitosPage.orderPanel).toBeVisible({ timeout: 5000 });
  await expect(hitosPage.orderNumberDisplay).toHaveText(orden);
  await expect(hitosPage.timeline).toBeVisible();
});

When('ingresa una coincidencia parcial {string}', async ({ hitosPage }, parcial: string) => {
  await hitosPage.searchOrder(parcial);
});

When('selecciona una orden de la lista mostrada', async ({ hitosPage }) => {
  await hitosPage.selectFirstOrderInList();
});

Then('el sistema carga correctamente la trazabilidad', async ({ hitosPage }) => {
  await expect(hitosPage.orderPanel).toBeVisible({ timeout: 5000 });
  await expect(hitosPage.orderNumberDisplay).not.toBeEmpty();
  await expect(hitosPage.timeline).toBeVisible();
});

When('selecciona el filtro {string}', async ({ hitosPage }, tipo: string) => {
  await hitosPage.filterByType(tipo);
});

Then('el sistema muestra únicamente órdenes {string} y carga su trazabilidad', async ({ hitosPage }, tipo: string) => {
  await expect(hitosPage.orderPanel).toBeVisible({ timeout: 5000 });
  await expect(hitosPage.orderNumberDisplay).toContainText(tipo);
  await expect(hitosPage.timeline).toBeVisible();
});

// US-08

Given('selecciona un hito pendiente', async ({ hitosPage }) => {
  await hitosPage.openFirstPendingHito();
});

When('completa la observación requerida {string}', async ({ hitosPage }, obs: string) => {
  await hitosPage.fillObservacion(obs);
});

When('confirma el hito utilizando la fecha autocompletada', async ({ hitosPage, page }) => {
  // It's pre-filled, so we just click confirm
  test.info().annotations.push({ type: 'alertMessage', description: '' });
  page.once('dialog', async dialog => {
    test.info().annotations[test.info().annotations.length - 1].description = dialog.message();
    await dialog.accept().catch(() => {});
  });
  await hitosPage.confirmHito();
});

Then('el sistema registra correctamente el hito', async ({ hitosPage, page }) => {
  await expect(hitosPage.observacionInput).not.toBeVisible();
  // We don't use waitForResponse here because it could already be resolved from the previous step click, causing a timeout.
  await page.waitForTimeout(1000); // Give it a second to refresh the timeline
});

When('registra una observación con longitud mínima válida {string}', async ({ hitosPage }, obs: string) => {
  await hitosPage.fillObservacion(obs);
});

When('confirma el hito', async ({ hitosPage, page }) => {
  // Capture alert if it happens
  test.info().annotations.push({ type: 'alertMessage', description: '' });
  page.once('dialog', async dialog => {
    test.info().annotations[test.info().annotations.length - 1].description = dialog.message();
    await dialog.accept().catch(() => {});
  });
  await hitosPage.confirmHito();
});

When('ingresa una observación menor al mínimo permitido {string}', async ({ hitosPage }, obs: string) => {
  await hitosPage.fillObservacion(obs);
});

Then('el sistema muestra validación correspondiente indicando que la observación no cumple con la longitud mínima requerida', async () => {
  const alerts = test.info().annotations.filter(a => a.type === 'alertMessage');
  const alertMsg = alerts.length > 0 ? alerts[alerts.length - 1].description : '';
  expect(alertMsg).toContain('longitud mínima');
});

When('el sistema carga la información de la orden', async ({ hitosPage }) => {
  await expect(hitosPage.orderPanel).toBeVisible({ timeout: 5000 });
});

When('el sistema carga la trazabilidad de la orden', async ({ hitosPage }) => {
  await expect(hitosPage.orderPanel).toBeVisible({ timeout: 5000 });
});

When('el sistema carga la línea de tiempo', async ({ hitosPage }) => {
  await expect(hitosPage.timeline).toBeVisible({ timeout: 5000 });
});

Then('muestra el resumen de la orden', async ({ hitosPage }) => {
  await expect(hitosPage.resumenTipo).not.toBeEmpty();
  await expect(hitosPage.resumenRegimen).not.toBeEmpty();
  await expect(hitosPage.resumenAgente).not.toBeEmpty();
  await expect(hitosPage.resumenEstado).not.toBeEmpty();
});

Then('muestra la barra de progreso actualizada', async ({ hitosPage }) => {
  await expect(hitosPage.progresoTexto).not.toBeEmpty();
  await expect(hitosPage.progresoTexto).toContainText('%');
});

Then('muestra la línea de tiempo con los hitos completados y pendientes', async ({ hitosPage }) => {
  const hitos = hitosPage.timeline.locator('.hito-h-item');
  const count = await hitos.count();
  expect(count).toBeGreaterThan(0);
});

Then('muestra la barra de progreso actualizada según los hitos registrados', async ({ hitosPage }) => {
  await expect(hitosPage.progresoTexto).not.toBeEmpty();
  await expect(hitosPage.progresoTexto).toContainText('%');
});

Given('la orden no tiene hitos registrados', async () => {
  // This is a precondition, the setup is assumed or already in place.
});

When('el sistema carga el progreso de la operación', async ({ hitosPage }) => {
  await expect(hitosPage.orderPanel).toBeVisible({ timeout: 5000 });
});

Then('muestra el porcentaje inicial de {string} correspondiente', async ({ hitosPage }, percentage: string) => {
  await expect(hitosPage.progresoTexto).not.toBeEmpty();
  await expect(hitosPage.progresoTexto).toContainText(percentage);
});
