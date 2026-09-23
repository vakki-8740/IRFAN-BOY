export default async function run(page, ui) {
  const file404 = [];
  page.on('response', r => { if (r.status() === 404) file404.push(r.url()); });

  await page.goto('http://127.0.0.1:8099/admin/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  return { file404 };
}