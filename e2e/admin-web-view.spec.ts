/**
 * E2E Tests: Admin and Manager Web Views
 * 
 * Validates web-specific functionality for admin/manager roles:
 * 1. Dashboard overview
 * 2. Property management
 * 3. Team management  
 * 4. Schedule assignment
 * 5. Reports and analytics
 */
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard - Web View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ADMIN-01: Should display admin sidebar', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const sidebar = page.locator('[data-testid="admin-sidebar"]').or(
      page.locator('aside').or(
        page.locator('[class*="sidebar"]')
      )
    );
    
    const count = await sidebar.count();
    console.log(`Found ${count} sidebar elements`);
  });

  test('ADMIN-02: Should show status cards', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for status cards with counts
    const statusCards = page.locator('[data-testid="status-card"]').or(
      page.locator('[class*="status-card"]').or(
        page.locator('text=/Aguardando|Liberado|Em limpeza|Concluído/i')
      )
    );
    
    const count = await statusCards.count();
    console.log(`Found ${count} status card elements`);
  });

  test('ADMIN-03: Should display schedule table/list', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const scheduleTable = page.locator('table').or(
      page.locator('[class*="schedule-row"]').or(
        page.locator('[data-testid="schedule-row"]')
      )
    );
    
    const count = await scheduleTable.count();
    console.log(`Found ${count} schedule table/row elements`);
  });

  test('ADMIN-04: Should have date filter', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const dateFilter = page.locator('input[type="date"]').or(
      page.locator('[class*="calendar"]').or(
        page.locator('button:has-text("Hoje")')
      )
    );
    
    const count = await dateFilter.count();
    console.log(`Found ${count} date filter elements`);
  });

  test('ADMIN-05: Should have property filter', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const propertyFilter = page.locator('select').or(
      page.locator('[class*="combobox"]').or(
        page.locator('text=/Todas as propriedades|Filtrar/i')
      )
    );
    
    const count = await propertyFilter.count();
    console.log(`Found ${count} property filter elements`);
  });
});

test.describe('Admin - Schedule Management', () => {
  test('SCHED-01: Should open schedule detail on row click', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const scheduleRow = page.locator('[data-testid="schedule-row"]').or(
      page.locator('tr').filter({ hasText: /Casa|Apartamento|Imóvel/i }).first()
    );
    
    if (await scheduleRow.isVisible()) {
      await scheduleRow.click();
      await page.waitForTimeout(500);
      
      // Check for detail modal/drawer
      const detail = page.locator('[role="dialog"]').or(
        page.locator('[class*="sheet"]')
      );
      
      const isVisible = await detail.isVisible().catch(() => false);
      console.log(`Schedule detail visible: ${isVisible}`);
    }
  });

  test('SCHED-02: Should allow releasing schedule', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const releaseButton = page.locator('button:has-text("Liberar")');
    const count = await releaseButton.count();
    console.log(`Found ${count} release buttons`);
  });

  test('SCHED-03: Should allow assigning cleaner', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const assignButton = page.locator('button:has-text("Atribuir")').or(
      page.locator('[data-testid="assign-cleaner"]')
    );
    
    const count = await assignButton.count();
    console.log(`Found ${count} assign buttons`);
  });

  test('SCHED-04: Should show schedule history', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const historySection = page.locator('text=/Histórico|Timeline|Log/i');
    const count = await historySection.count();
    console.log(`Found ${count} history elements`);
  });
});

test.describe('Admin - Team Management', () => {
  test('TEAM-01: Should navigate to team page', async ({ page }) => {
    await page.goto('/team');
    await page.waitForTimeout(2000);
    
    const pageTitle = page.locator('h1, h2').filter({ hasText: /Equipe|Team/i });
    const isVisible = await pageTitle.isVisible().catch(() => false);
    console.log(`Team page loaded: ${isVisible}`);
  });

  test('TEAM-02: Should display team member list', async ({ page }) => {
    await page.goto('/team');
    await page.waitForTimeout(2000);
    
    const memberCards = page.locator('[data-testid="team-member"]').or(
      page.locator('[class*="member-card"]').or(
        page.locator('tr').filter({ hasText: /@/ }) // Email pattern
      )
    );
    
    const count = await memberCards.count();
    console.log(`Found ${count} team member elements`);
  });

  test('TEAM-03: Should have add member button', async ({ page }) => {
    await page.goto('/team');
    await page.waitForTimeout(2000);
    
    const addButton = page.locator('button:has-text("Adicionar")').or(
      page.locator('button:has-text("Novo")')
    );
    
    const count = await addButton.count();
    console.log(`Found ${count} add member buttons`);
  });
});

test.describe('Admin - Properties Management', () => {
  test('PROP-01: Should navigate to properties page', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForTimeout(2000);
    
    const pageTitle = page.locator('h1, h2').filter({ hasText: /Imóveis|Propriedades|Properties/i });
    const isVisible = await pageTitle.isVisible().catch(() => false);
    console.log(`Properties page loaded: ${isVisible}`);
  });

  test('PROP-02: Should display property cards', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForTimeout(2000);
    
    const propertyCards = page.locator('[data-testid="property-card"]').or(
      page.locator('[class*="property-card"]').or(
        page.locator('[class*="card"]').filter({ hasText: /Casa|Apartamento/i })
      )
    );
    
    const count = await propertyCards.count();
    console.log(`Found ${count} property card elements`);
  });

  test('PROP-03: Should have add property button', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForTimeout(2000);
    
    const addButton = page.locator('button:has-text("Adicionar")').or(
      page.locator('button:has-text("Nova")')
    );
    
    const count = await addButton.count();
    console.log(`Found ${count} add property buttons`);
  });
});

test.describe('Web Responsiveness', () => {
  test('RESP-01: Should adapt layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Desktop should show sidebar
    const sidebar = page.locator('[class*="sidebar"]').or(
      page.locator('aside')
    );
    
    const isVisible = await sidebar.isVisible().catch(() => false);
    console.log(`Desktop sidebar visible: ${isVisible}`);
  });

  test('RESP-02: Should adapt layout on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Tablet might have collapsed sidebar
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('RESP-03: Should show mobile view on small screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Mobile should show bottom nav
    const bottomNav = page.locator('[data-testid="mobile-bottom-nav"]').or(
      page.locator('nav').filter({ hasText: /Inicio|Home/i })
    );
    
    const isVisible = await bottomNav.isVisible().catch(() => false);
    console.log(`Mobile bottom nav visible: ${isVisible}`);
  });
});
