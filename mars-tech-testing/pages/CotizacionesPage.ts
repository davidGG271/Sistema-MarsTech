import { expect, Locator, Page } from '@playwright/test';

export class CotizacionesPage {
  readonly page: Page;
  readonly btnNuevaCotizacion: Locator;
  readonly modalCotizacion: Locator;
  
  readonly clienteSelect: Locator;
  readonly monedaSelect: Locator;
  readonly validezInput: Locator;
  readonly lugarInput: Locator;
  readonly tiempoInput: Locator;
  readonly observacionesInput: Locator;
  readonly condicionesInput: Locator;

  readonly btnAgregarItem: Locator;
  readonly btnGuardar: Locator;

  constructor(page: Page) {
    this.page = page;
    
    this.btnNuevaCotizacion = page.locator('#btn-nueva-cot');
    this.modalCotizacion = page.locator('#modal-cotizacion');

    this.clienteSelect = page.locator('#cot-cliente');
    this.monedaSelect = page.locator('#cot-moneda');
    this.validezInput = page.locator('#cot-validez');
    this.lugarInput = page.locator('#cot-lugar');
    this.tiempoInput = page.locator('#cot-tiempo');
    this.observacionesInput = page.locator('#cot-observaciones');
    this.condicionesInput = page.locator('#cot-condiciones');

    this.btnAgregarItem = page.locator('#btn-agregar-item');
    this.btnGuardar = page.locator('#btn-guardar-cot');
  }

  async goto() {
    await this.page.goto('/ventas.html');
  }

  async abrirNuevaCotizacion() {
    await this.btnNuevaCotizacion.waitFor({ state: 'visible' });
    await this.btnNuevaCotizacion.click();
    await this.modalCotizacion.waitFor({ state: 'visible' });
  }

  async llenarFormularioGeneral(datos: {
    cliente: string;
    moneda: string;
    validez: string;
    lugar: string;
    tiempo: string;
    observaciones: string;
    condiciones: string;
  }) {
    // Para el cliente, usamos selectOption por label
    await this.clienteSelect.selectOption({ label: datos.cliente });
    await this.monedaSelect.selectOption({ value: datos.moneda });
    
    // Asumimos que datos.validez viene en formato YYYY-MM-DD para el input type="date"
    await this.validezInput.fill(datos.validez);
    
    if (datos.lugar !== 'vacío') await this.lugarInput.fill(datos.lugar);
    if (datos.tiempo !== 'vacío') await this.tiempoInput.fill(datos.tiempo);
    if (datos.observaciones !== 'vacío') await this.observacionesInput.fill(datos.observaciones);
    if (datos.condiciones !== 'vacío') await this.condicionesInput.fill(datos.condiciones);
  }

  async agregarItem(datos: {
    concepto: string;
    descripcion: string;
    cantidad: string;
    precio: string;
  }) {
    await this.btnAgregarItem.click();
    
    // Obtenemos la última fila agregada
    const lastItem = this.modalCotizacion.locator('#items-cotizacion > div').last();
    
    // Select option en el sel-concepto por texto
    await lastItem.locator('.sel-concepto').selectOption({ label: datos.concepto });
    
    if (datos.descripcion !== 'vacío') {
      await lastItem.locator('.inp-desc').fill(datos.descripcion);
    }
    
    await lastItem.locator('.inp-cantidad').fill(datos.cantidad);
    await lastItem.locator('.inp-precio').fill(datos.precio);
  }

  async guardarCotizacion() {
    // Manejar el alert nativo que lanza window.alert
    let alertHandled = false;
    this.page.once('dialog', async dialog => {
      alertHandled = true;
      await dialog.accept();
    });

    await this.btnGuardar.click();
    
    // Esperar a que el modal se cierre (si el registro fue exitoso)
    await expect(this.modalCotizacion).not.toHaveClass(/visible/, { timeout: 10000 });
  }
}
