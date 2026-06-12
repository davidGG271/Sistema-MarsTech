import { Page, Locator } from '@playwright/test';

export class HitosPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly typeFilter: Locator;
  readonly orderList: Locator;
  readonly orderPanel: Locator;
  readonly orderNumberDisplay: Locator;
  readonly emptyPanel: Locator;
  readonly timeline: Locator;

  readonly firstPendingHito: Locator;
  readonly observacionInput: Locator;
  readonly fechaInput: Locator;
  readonly confirmarBtn: Locator;

  readonly progresoTexto: Locator;
  readonly resumenTipo: Locator;
  readonly resumenRegimen: Locator;
  readonly resumenAgente: Locator;
  readonly resumenEstado: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('#filtro-orden-busqueda');
    this.typeFilter = page.locator('#filtro-orden-tipo');
    this.orderList = page.locator('#lista-ordenes-selector');
    this.orderPanel = page.locator('#panel-orden');
    this.orderNumberDisplay = page.locator('#orden-numero');
    this.emptyPanel = page.locator('#panel-vacio');
    this.timeline = page.locator('#linea-tiempo');
    this.firstPendingHito = page.locator('.hito-h-icon-wrap:not(.done)').first();
    this.observacionInput = page.locator('#modal-observacion');
    this.fechaInput = page.locator('#modal-fecha');
    this.confirmarBtn = page.locator('#btn-confirmar');
    this.progresoTexto = page.locator('#progreso-texto');
    this.resumenTipo = page.locator('#res-tipo');
    this.resumenRegimen = page.locator('#res-regimen');
    this.resumenAgente = page.locator('#res-agente');
    this.resumenEstado = page.locator('#res-estado');
  }

  async searchOrder(term: string) {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(500); // Wait for dynamic filtering
  }

  async filterByType(type: string) {
    await this.typeFilter.selectOption({ value: type });
    await this.page.waitForTimeout(500); // Wait for dynamic filtering
  }

  async selectFirstOrderInList() {
    // Look for the first order card in the list
    const firstOrder = this.orderList.locator('> div').first();
    await firstOrder.click();
  }

  async selectOrderByName(orderNumber: string) {
    const orderCard = this.orderList.locator('> div', { hasText: orderNumber }).first();
    await orderCard.click();
  }

  async openFirstPendingHito() {
    await this.firstPendingHito.click();
  }

  async fillObservacion(text: string) {
    await this.observacionInput.fill(text);
  }

  async fillFecha(date: string) {
    await this.fechaInput.fill(date);
  }

  async confirmHito() {
    await this.confirmarBtn.click();
  }

  getHitoCompletado(nombre: string) {
    return this.timeline.locator('.hito-h-item', { hasText: nombre });
  }
}
