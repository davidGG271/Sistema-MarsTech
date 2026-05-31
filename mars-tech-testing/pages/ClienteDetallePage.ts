import { Page, Locator } from '@playwright/test';

export class ClienteDetallePage {
  readonly page: Page;

  // Botón para editar
  readonly btnEditarCliente: Locator;

  // Elementos del Modal Editar
  readonly modalEditar: Locator;
  readonly tipoDocSelect: Locator;
  readonly rucInput: Locator;
  readonly razonSocialInput: Locator;
  readonly contactoInput: Locator;
  readonly telefonoInput: Locator;
  readonly emailInput: Locator;
  
  readonly btnGuardarCambios: Locator;

  constructor(page: Page) {
    this.page = page;

    this.btnEditarCliente = page.locator('#btn-editar-cliente');
    
    this.modalEditar = page.locator('#modal-editar');

    this.tipoDocSelect = page.locator('#e-tipo-doc');
    this.rucInput = page.locator('#e-ruc');
    this.razonSocialInput = page.locator('#e-razon');
    this.contactoInput = page.locator('#e-contacto');
    this.telefonoInput = page.locator('#e-telefono');
    this.emailInput = page.locator('#e-email');
    
    this.btnGuardarCambios = page.locator('#e-guardar');
  }

  async abrirModalEditar() {
    await this.page.waitForTimeout(1000); // Esperar a que clienteActual se cargue
    await this.btnEditarCliente.click();
    await this.modalEditar.waitFor({ state: 'visible' });
  }

  async llenarFormularioEdicion(datos: {
    numDoc?: string;
    razonSocial?: string;
    email?: string;
    telefono?: string;
  }) {
    if (datos.numDoc) {
      await this.rucInput.fill(datos.numDoc);
    }
    if (datos.razonSocial) {
      await this.razonSocialInput.fill(datos.razonSocial);
    }
    if (datos.email) {
      await this.emailInput.fill(datos.email);
    }
    if (datos.telefono) {
      await this.telefonoInput.fill(datos.telefono);
    }
  }

  async guardarCambios() {
    await this.btnGuardarCambios.click();
  }
}
