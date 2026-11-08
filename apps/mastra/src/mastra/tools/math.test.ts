import { describe, expect, test } from 'bun:test';
import { evaluate } from './math';

describe('evaluate', () => {
  test('dört işlem ve öncelik', () => {
    expect(evaluate('1234 * 5678')).toBe(7006652);
    expect(evaluate('2 + 3 * 4')).toBe(14);
    expect(evaluate('(2 + 3) * 4')).toBe(20);
    expect(evaluate('10 - 4 - 3')).toBe(3);
    expect(evaluate('100 / 8')).toBe(12.5);
    expect(evaluate('17 % 5')).toBe(2);
  });

  test('üs sağdan sola işler, tekli eksiden önce gelir', () => {
    expect(evaluate('2 ^ 3 ^ 2')).toBe(512);
    expect(evaluate('-2 ^ 2')).toBe(-4);
    expect(evaluate('2 ^ -1')).toBe(0.5);
  });

  test('ondalık, tekli işaret, × ve ÷', () => {
    expect(evaluate('0.1 + 0.2')).toBeCloseTo(0.3);
    expect(evaluate('-(3 + 4)')).toBe(-7);
    expect(evaluate('3 × 4 ÷ 6')).toBe(2);
    expect(evaluate('.5 * 4')).toBe(2);
  });

  test('fonksiyonlar', () => {
    expect(evaluate('sqrt(144) + abs(-3)')).toBe(15);
    expect(evaluate('round(2.6) + floor(2.9) + ceil(2.1)')).toBe(8);
  });

  test('geçersiz ifadeler hata verir, kod çalıştırmaz', () => {
    for (const bad of ['', '2 +', '(1 + 2', '1 + 2)', 'abc', '1 2', 'foo(3)', 'sqrt 4', '2 ** 3']) {
      expect(() => evaluate(bad)).toThrow('Geçersiz ifade');
    }
    expect(() => evaluate('process.exit(1)')).toThrow();
    expect(() => evaluate('constructor')).toThrow('Geçersiz ifade');
    expect(() => evaluate('1'.repeat(201))).toThrow('Geçersiz ifade');
  });

  test('sıfıra bölme ve taşma', () => {
    expect(() => evaluate('5 / 0')).toThrow('Sıfıra bölünemez');
    expect(() => evaluate('5 % 0')).toThrow('Sıfıra bölünemez');
    expect(() => evaluate('9 ^ 9 ^ 9')).toThrow('hesaplanamadı');
  });
});
