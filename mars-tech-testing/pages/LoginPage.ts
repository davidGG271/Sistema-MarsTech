import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Mapeo directo a los IDs de index.html
    this.emailInput = page.locator('#login-email');
    this.passwordInput = page.locator('#login-password');
    this.loginButton = page.locator('#btn-login');
    this.errorMessage = page.locator('#login-error');
  }

  async goto() {
    // Al haber definido el baseURL, solo necesita ir a index.html
    await this.page.goto('/index.html');
  }

  async login(email: string, clave: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(clave);
    await this.loginButton.click();
  }
}
