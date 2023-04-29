const performance = require("perf_hooks").performance;

/**
 * A test that demonstrates time leak of `===` comparison.
 * The needle 'm' is compared against all lowercase alphabetic characters
 */

const secret = "m";
const alphabet = "abcdefghijklmnopqrstuvwxyz";
const timings = {};
const runs = 1000;

for (let i = 0; i < alphabet.length; i++) {
  const char = alphabet.charAt(i);
  timings[char] = 0;
}

for (let run = 0; run < runs; run++) {
  for (let i = 0; i < alphabet.length; i++) {
    const char = alphabet.charAt(i);

    const startTime = performance.now();
    const test = char === secret;
    const endTime = performance.now();

    timings[char] += endTime - startTime;
  }
}

for (let i = 0; i < alphabet.length; i++) {
  const char = alphabet.charAt(i);
  timings[char] /= runs;
}

console.log(timings);

/**
 * Example test run 28/04/2013, that demonstrates that 'm' === 'm' takes longest.
 * 
    {
    a: 0.00006000566482543945,
    b: 0.00005637121200561523,
    c: 0.000054883480072021486,
    d: 0.00006125545501708984,
    e: 0.00005987930297851562,
    f: 0.000054481029510498045,
    g: 0.00005708026885986328,
    h: 0.0000558924674987793,
    i: 0.00005599212646484375,
    j: 0.00005095338821411133,
    k: 0.00005787801742553711,
    l: 0.00005756902694702148,
    m: 0.00021499824523925782, // <- longest
    n: 0.00006221103668212891,
    o: 0.00005495119094848633,
    p: 0.00005554628372192383,
    q: 0.00005572700500488281,
    r: 0.00005495262145996094,
    s: 0.00005662345886230469,
    t: 0.000058545112609863284,
    u: 0.000057175159454345704,
    v: 0.00006061697006225586,
    w: 0.00005445289611816406,
    x: 0.00005309295654296875,
    y: 0.00005454826354980469,
    z: 0.00006249237060546876
    }
 */