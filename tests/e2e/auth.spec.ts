import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/auth/login');

      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
      await expect(page.getByTestId('email-input')).toBeVisible();
      await expect(page.getByTestId('password-input')).toBeVisible();
      await expect(page.getByTestId('signin-button')).toBeVisible();
      await expect(page.getByTestId('google-signin-button')).toBeVisible();
    });

    test('should have link to signup page', async ({ page }) => {
      await page.goto('/auth/login');

      const signupLink = page.getByRole('link', { name: 'Sign up' });
      await expect(signupLink).toBeVisible();
      await signupLink.click();
      await expect(page).toHaveURL('/auth/signup');
    });

    test('should show error on invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByTestId('email-input').fill('invalid@example.com');
      await page.getByTestId('password-input').fill('wrongpassword');
      await page.getByTestId('signin-button').click();

      // Should show error message
      await expect(page.getByTestId('auth-error')).toBeVisible({ timeout: 10000 });
    });

    test('should have logo link to home', async ({ page }) => {
      await page.goto('/auth/login');

      const logo = page.getByRole('link', { name: /4o Legacy/ });
      await expect(logo).toBeVisible();
      await logo.click();
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Signup Page', () => {
    test('should display signup form', async ({ page }) => {
      await page.goto('/auth/signup');

      await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();
      await expect(page.getByTestId('email-input')).toBeVisible();
      await expect(page.getByTestId('password-input')).toBeVisible();
      await expect(page.getByTestId('confirm-password-input')).toBeVisible();
      await expect(page.getByTestId('signup-button')).toBeVisible();
      await expect(page.getByTestId('google-signup-button')).toBeVisible();
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/auth/signup');

      const loginLink = page.getByRole('link', { name: 'Sign in' });
      await expect(loginLink).toBeVisible();
      await loginLink.click();
      await expect(page).toHaveURL('/auth/login');
    });

    test('should show error when passwords do not match', async ({ page }) => {
      await page.goto('/auth/signup');

      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password123');
      await page.getByTestId('confirm-password-input').fill('differentpassword');
      await page.getByTestId('signup-button').click();

      await expect(page.getByTestId('auth-error')).toContainText('Passwords do not match');
    });

    test('should show error when password is too short', async ({ page }) => {
      await page.goto('/auth/signup');

      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('12345');
      await page.getByTestId('confirm-password-input').fill('12345');
      await page.getByTestId('signup-button').click();

      await expect(page.getByTestId('auth-error')).toContainText('at least 6 characters');
    });
  });

  test.describe('Homepage Auth UI', () => {
    test('should show Sign In button when not authenticated', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByTestId('signin-button')).toBeVisible();
    });

    test('should open auth modal when clicking Sign In', async ({ page }) => {
      await page.goto('/');

      await page.getByTestId('signin-button').click();

      await expect(page.getByTestId('auth-modal')).toBeVisible();
      await expect(page.getByTestId('modal-email-input')).toBeVisible();
    });

    test('should close modal when clicking backdrop', async ({ page }) => {
      await page.goto('/');

      await page.getByTestId('signin-button').click();
      await expect(page.getByTestId('auth-modal')).toBeVisible();

      // Click the backdrop (the outer div)
      await page.getByTestId('auth-modal').click({ position: { x: 10, y: 10 } });

      await expect(page.getByTestId('auth-modal')).not.toBeVisible();
    });

    test('should close modal when clicking close button', async ({ page }) => {
      await page.goto('/');

      await page.getByTestId('signin-button').click();
      await expect(page.getByTestId('auth-modal')).toBeVisible();

      await page.getByTestId('modal-close-button').click();

      await expect(page.getByTestId('auth-modal')).not.toBeVisible();
    });

    test('should close modal when pressing Escape', async ({ page }) => {
      await page.goto('/');

      await page.getByTestId('signin-button').click();
      await expect(page.getByTestId('auth-modal')).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(page.getByTestId('auth-modal')).not.toBeVisible();
    });

    test('should switch between signin and signup in modal', async ({ page }) => {
      await page.goto('/');

      await page.getByTestId('signin-button').click();
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

      // Switch to signup
      await page.getByRole('button', { name: 'Sign up' }).click();
      await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();
      await expect(page.getByTestId('modal-confirm-password-input')).toBeVisible();

      // Switch back to signin
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
      await expect(page.getByTestId('modal-confirm-password-input')).not.toBeVisible();
    });
  });
});
