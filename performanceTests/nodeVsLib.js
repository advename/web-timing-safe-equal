/**
 * Performance comparison of Node.JS native
 * `timingSafeEqual` vs the libraries `webTimingSafeEqual`
 */
const { performance } = require("perf_hooks");
const {
  webTimingSafeEqual,
  generateSecretKey,
} = require("../src/webTimingSafeEqual");
const timingSafeEqual = require("crypto").timingSafeEqual;

const testRuns = 10000;
const results = {};

const encoder = new TextEncoder();
const a = encoder.encode("testString1");
const b = encoder.encode("testString1");

(async () => {
  // Generate secret key
  const secretKey = await generateSecretKey();

  // Define methods to test
  const methods = [
    {
      name: "Node:timingSafeEqual",
      func: timingSafeEqual,
      isAsync: false,
      params: [a, b],
    },
    {
      name: "Lib:webTimingSafeEqual",
      func: webTimingSafeEqual,
      isAsync: true,
      params: [a, b],
    },
    {
      name: "Lib:webTimingSafeEqualWithPreGenKey",
      func: webTimingSafeEqual,
      isAsync: true,
      params: [a, b, { secretKey, hmacAlgorithm: "SHA-256" }],
    },
  ];

  // Run tests
  for (let i = 0; i < testRuns; i++) {
    for (const method of methods) {
      // Test the method
      const start = performance.now();
      if (method.isAsync) {
        await method.func(...method.params);
      } else {
        method.func(...method.params);
      }
      const end = performance.now();

      // Update results
      if (!results[method.name]) {
        results[method.name] = 0;
      }
      results[method.name] += end - start;
    }

    // Rotate methods array for fair comparison
    const firstMethod = methods.shift();
    methods.push(firstMethod);
  }

  // Calculate average time
  for (const method of methods) {
    results[method.name] /= testRuns;
  }

  // Display results
  console.log(results);

  // Calculate how many times slower one method is over the other
  // Find the fastest method's time
  const fastestTime = Math.min(...Object.values(results));

  // Calculate how many times slower other methods are compared to the fastest one
  for (const methodName in results) {
    const methodTime = results[methodName];
    const timesSlower = methodTime / fastestTime;
    console.log(
      `${methodName} is ${timesSlower.toFixed(
        2
      )} times slower than the fastest method.`
    );
  }
})();


/**
 * Example test run 28/04/2013
 * 
    {
    'Node:timingSafeEqual': 0.00029670338630676267,
    'Lib:webTimingSafeEqual': 0.0312298095703125,
    'Lib:webTimingSafeEqualWithPreGenKey': 0.017928896522521973
    }
    Node:timingSafeEqual is 1.00 times slower than the fastest method.
    Lib:webTimingSafeEqual is 105.26 times slower than the fastest method.
    Lib:webTimingSafeEqualWithPreGenKey is 60.43 times slower than the fastest method.
 * 
 * 
 */