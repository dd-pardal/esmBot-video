const multipliers = {
  k: 1e3,
  Ki: 1024,
  M: 1e6,
  Mi: 1048576,
  G: 1e9,
  Gi: 1073741824,
  T: 1e12,
  Ti: 1099511627776
};

export function parseNumberWithMultipliers(str) {
  const matched = str.trim().match(/^(\d+(?:\.\d*)?)(k|Ki|[MGT]i?)?$/);
  if (matched && matched[1]) {
    let result = Number.parseFloat(matched[1]);
    if (!isNaN(result)) {
      if (matched[2]) {
        result *= multipliers[matched[2]];
      }
      return result;
    }
  }
  throw new SyntaxError("Invalid number format");
}
