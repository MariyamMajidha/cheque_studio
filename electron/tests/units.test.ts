// path: tests/units.test.ts
import { mmToPx, pxToMm } from '../../renderer/src/lib/units';
import { amountToWords } from '../../renderer/src/lib/amountToWords';

test('mm<->px conversion no drift', () => {
  const mm = 25.4; // 1 inch
  const dpi = 300;
  const px = mmToPx(mm, dpi);
  expect(px).toBeCloseTo(300, 5);
  expect(pxToMm(px, dpi)).toBeCloseTo(mm, 5);
});

test('amount to words', () => {
  expect(amountToWords(1234.5)).toBe(
    'One Thousand Two Hundred Thirty Four Rufiyaa and Fifty Laari'
  );
  expect(amountToWords(0)).toBe('Zero Rufiyaa');
});
