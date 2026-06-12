import { Page, Locator } from '@playwright/test';

export class FinanzasPage {
  readonly page: Page;
  readonly orderSelector: Locator;
  readonly newIncomeBtn: Locator;
  readonly typeDropdown: Locator;
  readonly serieInput: Locator;
  readonly conceptDropdown: Locator;
  readonly currencyDropdown: Locator;
  readonly amountInput: Locator;
  readonly igvDropdown: Locator;
  readonly dueDateInput: Locator;
  readonly statusDropdown: Locator;
  readonly saveBtn: Locator;
  readonly kpiIngresos: Locator;
  readonly kpiCostos: Locator;
  readonly tabContent: Locator;

  // Costos locators
  readonly tabCostosBtn: Locator;
  readonly btnNuevoCosto: Locator;
  readonly cosConcepto: Locator;
  readonly cosProveedor: Locator;
  readonly cosMoneda: Locator;
  readonly cosMonto: Locator;
  readonly cosIgvModo: Locator;
  readonly cosComprobante: Locator;
  readonly btnGuardarCosto: Locator;

  // Solicitudes locators
  readonly tabSolicitudesBtn: Locator;
  readonly btnNuevaSol: Locator;
  readonly solConcepto: Locator;
  readonly solBeneficiario: Locator;
  readonly solMoneda: Locator;
  readonly solMonto: Locator;
  readonly solIgvModo: Locator;
  readonly solSustento: Locator;
  readonly btnGuardarSol: Locator;
  readonly kpiPendiente: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orderSelector = page.locator('#selector-orden');
    this.newIncomeBtn = page.locator('#btn-nuevo-ingreso');
    this.typeDropdown = page.locator('#ing-tipo');
    this.serieInput = page.locator('#ing-serie');
    this.conceptDropdown = page.locator('#ing-concepto');
    this.currencyDropdown = page.locator('#ing-moneda');
    this.amountInput = page.locator('#ing-monto');
    this.igvDropdown = page.locator('#ing-igv-modo');
    this.dueDateInput = page.locator('#ing-vencimiento');
    this.statusDropdown = page.locator('#ing-estado-pago');
    this.saveBtn = page.locator('#btn-guardar-ingreso');
    this.kpiIngresos = page.locator('#kpi-ingresos');
    this.kpiCostos = page.locator('#kpi-costos');
    this.tabContent = page.locator('#tab-content');

    this.tabCostosBtn = page.locator('button[data-tab="costos"]');
    this.btnNuevoCosto = page.locator('#btn-nuevo-costo');
    this.cosConcepto = page.locator('#cos-concepto');
    this.cosProveedor = page.locator('#cos-proveedor');
    this.cosMoneda = page.locator('#cos-moneda');
    this.cosMonto = page.locator('#cos-monto');
    this.cosIgvModo = page.locator('#cos-igv-modo');
    this.cosComprobante = page.locator('#cos-comprobante');
    this.btnGuardarCosto = page.locator('#btn-guardar-costo');

    this.tabSolicitudesBtn = page.locator('button[data-tab="solicitudes"]');
    this.btnNuevaSol = page.locator('#btn-nueva-sol');
    this.solConcepto = page.locator('#sol-concepto');
    this.solBeneficiario = page.locator('#sol-beneficiario');
    this.solMoneda = page.locator('#sol-moneda');
    this.solMonto = page.locator('#sol-monto');
    this.solIgvModo = page.locator('#sol-igv-modo');
    this.solSustento = page.locator('#sol-sustento');
    this.btnGuardarSol = page.locator('#btn-guardar-sol');
    this.kpiPendiente = page.locator('#kpi-pendiente');
  }

  async selectOrder(orderNumber: string) {
    // The option text is like "AIR-000001 — Cliente X", so we can select by text or label.
    // Playwright selectOption can match label
    await this.orderSelector.selectOption({ label: orderNumber });
    await this.page.waitForTimeout(500); // wait for load
  }

  async selectOrderByValue(orderId: string) {
    await this.orderSelector.selectOption(orderId);
    await this.page.waitForTimeout(500); // wait for load
  }
}
