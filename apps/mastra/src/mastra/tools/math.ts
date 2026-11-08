const MAX_LENGTH = 200;

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
};

// Güvenli hesap: eval kullanmaz. Desteklenen: + - * / % ^ ( ) ondalık sayı, sqrt/abs/round/floor/ceil
// Öncelik: ^ (sağdan sola) > unary - > * / % > + -
export function evaluate(input: string): number {
  // "1 234" gibi rakamlar arası boşluk sessizce 1234 olmasın diye reddedilir
  if (/[\d.]\s+[\d.]/.test(input)) throw new Error('Geçersiz ifade');

  const source = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  if (!source || source.length > MAX_LENGTH) throw new Error('Geçersiz ifade');

  let pos = 0;
  const peek = () => source[pos];
  const fail = (): never => {
    throw new Error('Geçersiz ifade');
  };

  function parseExpression(): number {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = source[pos++];
      const right = parseTerm();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseUnary();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = source[pos++];
      const right = parseUnary();
      if ((op === '/' || op === '%') && right === 0) throw new Error('Sıfıra bölünemez');
      value = op === '*' ? value * right : op === '/' ? value / right : value % right;
    }
    return value;
  }

  // -2^2 = -(2^2): üs, tekli eksiden önce gelir
  function parseUnary(): number {
    if (peek() === '-') {
      pos++;
      return -parseUnary();
    }
    if (peek() === '+') {
      pos++;
      return parseUnary();
    }
    return parsePower();
  }

  function parsePower(): number {
    const base = parsePrimary();
    if (peek() === '^') {
      pos++;
      return base ** parseUnary();
    }
    return base;
  }

  function parsePrimary(): number {
    const char = peek();

    if (char === '(') {
      pos++;
      const value = parseExpression();
      if (source[pos++] !== ')') fail();
      return value;
    }

    const name = /^[a-z]+/.exec(source.slice(pos))?.[0];
    if (name) {
      const fn = FUNCTIONS[name];
      if (!fn || source[pos + name.length] !== '(') fail();
      pos += name.length + 1;
      const value = parseExpression();
      if (source[pos++] !== ')') fail();
      return fn?.(value) ?? fail();
    }

    const number = /^\d+(\.\d+)?|^\.\d+/.exec(source.slice(pos))?.[0];
    if (!number) fail();
    pos += number?.length ?? 0;
    return Number(number);
  }

  const result = parseExpression();
  if (pos !== source.length) fail();
  if (!Number.isFinite(result)) throw new Error('Sonuç hesaplanamadı (çok büyük veya geçersiz)');
  return result;
}
