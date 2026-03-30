import { test, expect } from "@playwright/test";

test.describe("Hugoビルド検証", () => {
  test("トップページが200を返す", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("トップページにコンテンツが存在する", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title).toBeTruthy();
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("記事一覧ページ /entry/ が存在する", async ({ page }) => {
    const response = await page.goto("/entry/");
    expect(response?.status()).toBe(200);
  });

  test("記事ページが200を返す", async ({ page }) => {
    await page.goto("/");
    const firstArticleLink = page.locator('a[href*="/entry/"]').first();
    await expect(firstArticleLink).toBeVisible();

    const href = await firstArticleLink.getAttribute("href");
    expect(href).toBeTruthy();

    const response = await page.goto(href!);
    expect(response?.status()).toBe(200);
  });

  test("英語トップページが200を返す", async ({ page }) => {
    const response = await page.goto("/en/");
    expect(response?.status()).toBe(200);
  });

  test("存在しないパスに404を返す", async ({ page }) => {
    const response = await page.goto("/this-path-does-not-exist-at-all/");
    expect(response?.status()).toBe(404);
  });

  test("sitemap.xmlが存在する", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/<sitemapindex|<urlset/);
  });

  test("RSSフィードが存在する", async ({ request }) => {
    const response = await request.get("/index.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("<rss");
  });
});
