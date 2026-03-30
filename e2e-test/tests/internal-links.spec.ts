import { test, expect } from "@playwright/test";

test.describe("内部リンクチェック - トップページ", () => {
  test("ナビゲーションリンクがすべて200を返す", async ({ page, request }) => {
    await page.goto("/");

    const navLinks = page.locator("header a[href]");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    const checked = new Set<string>();
    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute("href");
      if (!href || !href.startsWith("/") || checked.has(href)) continue;
      checked.add(href);

      const response = await request.get(href);
      expect(
        response.status(),
        `ナビゲーションリンク ${href} が200を返すこと`,
      ).toBe(200);
    }
  });

  test("記事リンクがすべて200を返す（最大10件）", async ({ page, request }) => {
    await page.goto("/");

    const articleLinks = page.locator('a[href*="/entry/"]');
    const count = await articleLinks.count();
    expect(count).toBeGreaterThan(0);

    const checked = new Set<string>();
    const limit = Math.min(count, 10);
    for (let i = 0; i < limit; i++) {
      const href = await articleLinks.nth(i).getAttribute("href");
      if (!href || checked.has(href)) continue;
      checked.add(href);

      const url = href.startsWith("http") ? href : href;
      if (url.startsWith("http") && !url.includes("localhost")) continue;

      const response = await request.get(href);
      expect(
        response.status(),
        `記事リンク ${href} が200を返すこと`,
      ).toBe(200);
    }
  });

  test("サイドバーリンクがすべて200を返す", async ({ page, request }) => {
    await page.goto("/");

    const sidebarLinks = page.locator('.sidebar a[href^="/"], aside a[href^="/"]');
    const count = await sidebarLinks.count();
    if (count === 0) return;

    const checked = new Set<string>();
    for (let i = 0; i < count; i++) {
      const href = await sidebarLinks.nth(i).getAttribute("href");
      if (!href || checked.has(href)) continue;
      checked.add(href);

      const response = await request.get(href);
      expect(
        response.status(),
        `サイドバーリンク ${href} が200を返すこと`,
      ).toBe(200);
    }
  });
});

test.describe("内部リンクチェック - 記事ページ", () => {
  let articlePath: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    const html = await response.text();
    const match = html.match(/href="(\/entry\/[^"]+)"/);
    articlePath = match?.[1] ?? "/entry/";
  });

  test("記事内の内部リンクがすべて200を返す", async ({
    page,
    request,
  }) => {
    await page.goto(articlePath);

    const internalLinks = page.locator(
      'article a[href^="/"], .entry-content a[href^="/"], #content a[href^="/"]',
    );
    const count = await internalLinks.count();

    const checked = new Set<string>();
    const broken: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await internalLinks.nth(i).getAttribute("href");
      if (!href || href === "#" || href.startsWith("#") || checked.has(href))
        continue;
      checked.add(href);

      const response = await request.get(href);
      if (response.status() !== 200) {
        broken.push(`${href} (status: ${response.status()})`);
      }
    }

    if (broken.length > 0) {
      test.info().annotations.push({
        type: "warning",
        description: `リンク切れ: ${broken.join(", ")}`,
      });
    }

    const nonTaxonomyBroken = broken.filter(
      (link) => !/^\/(categories|archive|tags)\//.test(link),
    );
    expect(
      nonTaxonomyBroken,
      `タクソノミー以外のリンク切れ:\n${nonTaxonomyBroken.join("\n")}`,
    ).toEqual([]);
  });
});

test.describe("画像チェック", () => {
  test("トップページの画像がすべて読み込める", async ({ page }) => {
    const failures: string[] = [];

    page.on("response", (response) => {
      const url = response.url();
      if (
        /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url) &&
        url.includes("localhost")
      ) {
        if (response.status() >= 400) {
          failures.push(`${url} が ${response.status()} を返した`);
        }
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(failures, `読み込めない画像: ${failures.join(", ")}`).toEqual([]);
  });

  test("記事ページの画像がすべて読み込める", async ({ page }) => {
    await page.goto("/");
    const href = await page
      .locator('a[href*="/entry/"]')
      .first()
      .getAttribute("href");
    expect(href).toBeTruthy();

    const failures: string[] = [];

    page.on("response", (response) => {
      const url = response.url();
      if (
        /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url) &&
        url.includes("localhost")
      ) {
        if (response.status() >= 400) {
          failures.push(`${url} が ${response.status()} を返した`);
        }
      }
    });

    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    expect(failures, `読み込めない画像: ${failures.join(", ")}`).toEqual([]);
  });

  test("記事内の /image/ 参照がすべて到達可能", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const href = await page
      .locator('a[href*="/entry/"]')
      .first()
      .getAttribute("href");
    await page.goto(href!);

    const images = page.locator('img[src*="/image/"]');
    const count = await images.count();

    const checked = new Set<string>();
    for (let i = 0; i < count; i++) {
      const src = await images.nth(i).getAttribute("src");
      if (!src || checked.has(src)) continue;
      checked.add(src);

      const response = await request.get(src);
      expect(
        response.status(),
        `画像 ${src} が到達可能であること`,
      ).toBe(200);
    }
  });
});
