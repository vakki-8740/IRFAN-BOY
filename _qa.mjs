export default async function run(page, ui) {
  const log = [];

  // --- Login flow ---
  await page.locator('#password').fill('irfan123');
  await page.locator('#loginForm button[type=submit]').click();
  await page.waitForTimeout(1200);
  log.push({ step: 'after-login-url', url: page.url() });

  // Dashboard
  const dashTitle = await page.title();
  const hasSidebar = await page.locator('.admin-side').count();
  const hasStats = await page.locator('.stat-value').count();
  const viewTitle = await page.locator('#viewTitle').innerText().catch(() => '(none)');
  log.push({ step: 'dashboard', title: dashTitle, hasSidebar, hasStats, viewTitle });

  // Menu: exactly 3
  const navCount = await page.locator('#adminNav a').count();
  const navLabels = await page.locator('#adminNav a').allInnerTexts();
  log.push({ step: 'menu', navCount, navLabels: navLabels.map(s => s.replace(/\s+/g, ' ').trim()) });

  const recentHead = await page.locator('.ticket-list-head h2').innerText().catch(() => '(none)');
  log.push({ step: 'recent', recentHead });

  // Direct URL views
  for (const [view, file] of [
    ['tickets', 'tickets.html'],
    ['settings', 'settings.html'],
    ['dashboard', 'index.html']
  ]) {
    await page.goto('http://127.0.0.1:8099/admin/' + file, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#viewTitle', { timeout: 10000 });
    await page.waitForTimeout(300);
    const vt = await page.locator('#viewTitle').innerText();
    log.push({ step: 'nav-' + view, viewTitle: vt, url: page.url() });
  }

  // Inject fake ticket
  await page.evaluate(() => {
    const d = new Date();
    const p = n => (n < 10 ? '0' + n : '' + n);
    const now = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    localStorage.setItem('irfan_tickets', JSON.stringify([{
      id: 'abc123def456', created_at: now, type: 'deposit',
      name: 'Test User', mobile: '9999999999', email: 'test@example.com',
      game_pass: 'secret123', problem: 'Pending', amount: '500',
      verify_email: '', image: '', issue: 'Money not added', status: 'pending',
      _synced: true
    }]));
  });

  await page.goto('http://127.0.0.1:8099/admin/tickets.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tc-row, .tc-empty', { timeout: 10000 });
  await page.waitForTimeout(600);

  const statTotal = await page.locator('#statTotal').innerText().catch(() => '(n/a)');
  const statPending = await page.locator('#statPending').innerText().catch(() => '(n/a)');
  const rows = await page.locator('.tc-row').count();
  const navTicketCount = await page.locator('#navTicketCount').innerText().catch(() => '(n/a)');
  log.push({ step: 'with-ticket', statTotal, statPending, rows, navTicketCount });

  // Open detail page
  if (rows > 0) {
    await page.locator('.tc-row', { hasText: 'Test User' }).first().click();
    await page.waitForURL('**/admin/ticket.html?id=*', { timeout: 10000 });
    await page.waitForSelector('.td-card', { timeout: 10000 });
    await page.waitForTimeout(400);
    const labels = await page.locator('.td-label').allInnerTexts();
    const copyCount = await page.locator('.td-copy').count();
    const hasPasswordLabel = labels.some(l => /Game Account Password/i.test(l));
    const badLabel = labels.find(l => /Game ID|Game \//i.test(l));
    log.push({
      step: 'detail',
      url: page.url(),
      labelCount: labels.length,
      copyCount,
      hasPasswordLabel,
      badLabel: badLabel || null,
      hasDelete: await page.locator('[data-act="delete"]').count(),
      hasResolve: await page.locator('[data-act="resolved"], [data-act="pending"]').count()
    });

    const statusBtn = page.locator('[data-act="resolved"], [data-act="pending"]').first();
    if (await statusBtn.count()) {
      await statusBtn.click();
      await page.waitForTimeout(500);
      const statusRow = await page.locator('.td-row', { hasText: 'STATUS' }).innerText().catch(() => '');
      log.push({ step: 'status-toggle', statusRow: statusRow.replace(/\s+/g, ' ').trim() });
    }
  } else {
    log.push({ step: 'detail', skipped: true, reason: 'no rows' });
  }

  // Search on tickets page
  await page.goto('http://127.0.0.1:8099/admin/tickets.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#searchInput', { timeout: 10000 });
  await page.locator('#searchInput').fill('nomatch');
  await page.waitForTimeout(300);
  const noMatchRows = await page.locator('.tc-row').count();
  await page.locator('#searchInput').fill('Test');
  await page.waitForTimeout(300);
  const matchRows = await page.locator('.tc-row').count();
  log.push({ step: 'search', noMatchRows, matchRows });

  return log;
}
