import { Page, Locator } from '@playwright/test';

export class SidebarMenu {
  readonly page: Page;
  readonly overviewLink: Locator;
  readonly clientesLink: Locator;
  readonly ventasLink: Locator;
  readonly ordenesLink: Locator;
  readonly hitosLink: Locator;
  readonly finanzasLink: Locator;
  readonly stockLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Mapeo de la barra lateral usando los atributos href exactos del HTML
    this.overviewLink = page.locator('a[href="dashboard.html"]');
    this.clientesLink = page.locator('a[href="clientes.html"]');
    this.ventasLink = page.locator('a[href="ventas.html"]');
    this.ordenesLink = page.locator('a[href="ordenes.html"]');
    this.hitosLink = page.locator('a[href="hitos.html"]');
    this.finanzasLink = page.locator('a[href="finanzas.html"]');
    this.stockLink = page.locator('a[href="stock.html"]');
    this.logoutButton = page.locator('.sb-logout');
  }

  async irAClientes() {
    await this.clientesLink.click();
  }

  async irAVentas() {
    await this.ventasLink.click();
  }

  async irAOrdenes() {
    await this.ordenesLink.click();
  }

  async irAHitos() {
    await this.hitosLink.click();
  }

  async irAFinanzas() {
    await this.finanzasLink.click();
  }

  async irAStock() {
    await this.stockLink.click();
  }

  async cerrarSesion() {
    await this.logoutButton.click();
  }
}
