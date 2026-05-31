import { Page, Locator } from '@playwright/test';

export class ClientesPage {
  readonly page: Page;

  // Elementos de la vista principal
  readonly btnNuevoCliente: Locator;
  readonly inputBusqueda: Locator;
  readonly selectFiltroTipo: Locator;
  readonly tbodyClientes: Locator;

  // Elementos del Modal (Nuevo / Editar Cliente)
  readonly tipoDocSelect: Locator;
  readonly numeroDocInput: Locator;
  readonly razonSocialInput: Locator;
  readonly contactoInput: Locator;
  readonly telefonoInput: Locator;
  readonly emailInput: Locator;
  readonly tipoClienteSelect: Locator;
  readonly paisInput: Locator;
  readonly direccionInput: Locator;
  readonly vendedorInput: Locator;
  readonly condicionPagoSelect: Locator;
  readonly creditoLimiteInput: Locator;
  readonly observacionesInput: Locator;
  
  readonly btnGuardarCliente: Locator;
  readonly btnCancelarCliente: Locator;

  constructor(page: Page) {
    this.page = page;

    // Locators Vista
    this.btnNuevoCliente = page.locator('#btn-nuevo-cliente');
    this.inputBusqueda = page.locator('#filtro-busqueda');
    this.selectFiltroTipo = page.locator('#filtro-tipo');
    this.tbodyClientes = page.locator('#tbody-clientes');

    // Locators Modal
    this.tipoDocSelect = page.locator('#cli-tipo-doc');
    this.numeroDocInput = page.locator('#cli-ruc');
    this.razonSocialInput = page.locator('#cli-razon');
    this.contactoInput = page.locator('#cli-contacto');
    this.telefonoInput = page.locator('#cli-telefono');
    this.emailInput = page.locator('#cli-email');
    this.tipoClienteSelect = page.locator('#cli-tipo');
    this.paisInput = page.locator('#cli-pais');
    this.direccionInput = page.locator('#cli-direccion');
    this.vendedorInput = page.locator('#cli-vendedor');
    this.condicionPagoSelect = page.locator('#cli-condicion');
    this.creditoLimiteInput = page.locator('#cli-credito');
    this.observacionesInput = page.locator('#cli-obs');

    this.btnGuardarCliente = page.locator('#modal-cli-guardar');
    this.btnCancelarCliente = page.locator('#modal-cli-cancelar');
  }

  /** Acciones Principales */

  async abrirModalNuevoCliente() {
    await this.btnNuevoCliente.click();
  }

  async buscarCliente(texto: string) {
    await this.inputBusqueda.fill(texto);
    // Asumimos que la búsqueda es on-type o necesita un pequeño delay
    await this.page.waitForTimeout(500); 
  }

  async filtrarPorTipo(tipo: 'TODOS' | 'importador' | 'exportador' | 'ambos') {
    await this.selectFiltroTipo.selectOption(tipo);
    await this.page.waitForTimeout(500);
  }

  async llenarFormularioCliente(datos: any) {
    if (datos.tipoDoc) await this.tipoDocSelect.selectOption(datos.tipoDoc);
    if (datos.numDoc) await this.numeroDocInput.fill(datos.numDoc);
    if (datos.razonSocial) await this.razonSocialInput.fill(datos.razonSocial);
    if (datos.contacto) await this.contactoInput.fill(datos.contacto);
    if (datos.telefono) await this.telefonoInput.fill(datos.telefono);
    if (datos.email) await this.emailInput.fill(datos.email);
    if (datos.tipoCliente) await this.tipoClienteSelect.selectOption(datos.tipoCliente);
    if (datos.pais) await this.paisInput.fill(datos.pais);
    if (datos.direccion) await this.direccionInput.fill(datos.direccion);
    if (datos.vendedor) await this.vendedorInput.fill(datos.vendedor);
    if (datos.condicionPago) await this.condicionPagoSelect.selectOption(datos.condicionPago);
    if (datos.creditoLimite) await this.creditoLimiteInput.fill(datos.creditoLimite.toString());
    if (datos.observaciones) await this.observacionesInput.fill(datos.observaciones);
  }

  async guardarCliente() {
    await this.btnGuardarCliente.click();
  }
}
