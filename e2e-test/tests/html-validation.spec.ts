import { test, expect, type Page } from "@playwright/test";

async function validateCommonHtml(page: Page) {
  const lang = await page.locator("html").getAttribute("lang");
  expect(lang).toBeTruthy();

  await expect(page.locator("head")).toHaveCount(1);
  await expect(page.locator("body")).toHaveCount(1);
  await expect(page.locator('main[role="main"]')).toHaveCount(1);

  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
}

test.describe("HTML検証 - トップページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("lang属性がjaである", async ({ page }) => {
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("ja");
  });

  test("必須のhead要素が存在する", async ({ page }) => {
    await expect(page.locator("head > title")).toHaveCount(1);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    await expect(page.locator('head > meta[charset]')).toHaveCount(1);
    await expect(page.locator('head > meta[name="viewport"]')).toHaveCount(1);
  });

  test("OGPメタタグが存在する", async ({ page }) => {
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(1);
  });

  test("Twitterカードメタタグが存在する", async ({ page }) => {
    await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:site"]')).toHaveCount(1);
  });

  test("基本的なHTML構造が正しい", async ({ page }) => {
    await validateCommonHtml(page);
  });
});

test.describe("HTML検証 - 記事ページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    const href = await page
      .locator('a[href*="/entry/"]')
      .first()
      .getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
  });

  test("基本的なHTML構造が正しい", async ({ page }) => {
    await validateCommonHtml(page);
  });

  test("og:descriptionが存在する", async ({ page }) => {
    const description = page.locator('meta[property="og:description"]');
    await expect(description).toHaveCount(1);
    const content = await description.getAttribute("content");
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });

  test("OGPメタタグが存在する", async ({ page }) => {
    for (const prop of ["og:title", "og:description", "og:url"]) {
      const el = page.locator(`meta[property="${prop}"]`);
      await expect(el).toHaveCount(1);
      const content = await el.getAttribute("content");
      expect(content).toBeTruthy();
    }
  });

  test("記事タイトルがh1に存在する", async ({ page }) => {
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    const text = await h1.textContent();
    expect(text!.trim().length).toBeGreaterThan(0);
  });

  test("canonicalリンクが存在する", async ({ page }) => {
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const href = await canonical.getAttribute("href");
    expect(href).toMatch(/^https?:\/\//);
  });
});

test.describe("HTML検証 - 英語ページ", () => {
  test("lang属性がenである", async ({ page }) => {
    await page.goto("/en/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("en");
  });

  test("基本的なHTML構造が正しい", async ({ page }) => {
    await page.goto("/en/");
    await validateCommonHtml(page);
  });
});
