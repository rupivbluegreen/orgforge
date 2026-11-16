export const fmtAED = (v: number): string => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? (a / 1e6).toFixed(a >= 100e6 ? 0 : 1) + 'M' : a >= 1e3 ? Math.round(a / 1e3) + 'K' : String(Math.round(a));
  return (v < 0 ? '−' : '') + 'AED ' + s;
};

export const fmtN = (v: number): string => Number(v).toLocaleString('en-US');
