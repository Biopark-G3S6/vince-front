import { expect, test } from '@playwright/test';

import { screens } from './screens';
import { sessionRoleForPath, setSession } from './auth';

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`todas as telas respeitam a largura de ${width}px`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile',
      'A matriz de larguras é executada uma vez no Chromium desktop.',
    );
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 960 });
    await page.clock.setFixedTime(new Date('2026-10-15T12:00:00.000Z'));
    await page.goto('/');

    for (const [name, path] of screens) {
      await test.step(name, async () => {
        await setSession(page, sessionRoleForPath(path));
        await page.goto(path);
        await expect(page.locator('h1:visible, h2:visible').first()).toBeVisible();
        // Include text and controls whose parents may hide page overflow. A table or
        // A4 document can scroll inside its own container without widening the page.
        const overflow = await page.evaluate(() => {
          const viewport = document.documentElement.clientWidth;
          const candidates = document.querySelectorAll<HTMLElement>(
            'h1,h2,h3,h4,p,a,button,input,select,textarea,label,li,td,th,[role="tab"],[role="dialog"],[contenteditable="true"]',
          );
          const offenders: string[] = [];
          for (const element of candidates) {
            const style = getComputedStyle(element);
            const bounds = element.getBoundingClientRect();
            if (
              bounds.width <= 2 ||
              bounds.height <= 2 ||
              style.visibility === 'hidden' ||
              !element.getClientRects().length
            )
              continue;
            let insideScroller = false;
            for (
              let parent = element.parentElement;
              parent && parent !== document.body;
              parent = parent.parentElement
            ) {
              const parentStyle = getComputedStyle(parent);
              if (
                ['auto', 'scroll'].includes(parentStyle.overflowX) &&
                parent.scrollWidth > parent.clientWidth
              ) {
                insideScroller = true;
                break;
              }
            }
            if (insideScroller) continue;
            let left = bounds.left;
            let right = bounds.right;
            if (
              !element.children.length &&
              style.textOverflow !== 'ellipsis' &&
              element.textContent?.trim()
            ) {
              const range = document.createRange();
              range.selectNodeContents(element);
              const textBounds = range.getBoundingClientRect();
              left = Math.min(left, textBounds.left);
              right = Math.max(right, textBounds.right);
            }
            if (left < -2 || right > viewport + 2) {
              const label =
                element.getAttribute('aria-label') ||
                element.textContent?.trim().slice(0, 65) ||
                element.tagName;
              offenders.push(
                `${element.tagName} ${label}: ${Math.round(left)}..${Math.round(right)} (viewport ${viewport})`,
              );
            }
          }
          return {
            pageWidth: document.documentElement.scrollWidth,
            viewport,
            offenders: offenders.slice(0, 15),
          };
        });
        expect
          .soft(overflow.pageWidth, `${name}: largura do documento`)
          .toBeLessThanOrEqual(width + 1);
        expect.soft(overflow.viewport, `${name}: viewport esperada`).toBe(width);
        expect.soft(overflow.offenders, `${name}: conteúdo fora da viewport`).toEqual([]);
      });
    }
  });
}
