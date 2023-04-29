# Web Timing Safe Equal

A JavaScript library for timing-safe comparison of strings using the "Double HMAC verification" pattern. The library works in Node.js, Edge and Browser environments and uses the [Subtle WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) under the hood.

> **Node.js**  
> If you need a timing safe comparison function for Node.js only, then consider using the native [`crypto.timingSafeEqual`](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b) implementation.

## Installation

```bash
npm install @advena/web-timing-safe-equal
```

## Usage

```javascript
const { webTimingSafeEqual } = require("web-timing-safe-equal");

const left = "my secret value";
const right = "another secret value";

(async () => {
  const isEqual = await webTimingSafeEqual(left, right);
  console.log("Are the values equal?", isEqual); // false
})();
```

## About `web-timing-safe-equal`

### Inspiration

Node.JS has a native [`crypto.timingSafeEqual`](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b) function for time constant comparison, which has been available since version 6 (2016).

However, there is no similar function for time safe comparison of values in web or edge environments. Cloudflare Workers runtime, upon which the Next.js Edge runtime is built, [recently added](https://github.com/cloudflare/workerd/blob/d91547dfbb9e502c4bf30f002b46e32b37e07efd/src/node/crypto.ts#L19) the Node.js `timingSafeEqual` to their runtime as a non-standard extension. You can find more information in the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/#subtlecrypto-methods). This means `timingSafeEqual` _might_ be available in the latest Edge runtime.

There is a [feature request](https://github.com/w3c/webcrypto/issues/270#issuecomment-1525548902) with the Web3 Consortium to add a similar native function to the WebCrypto API. However, even if it is implemented, it may take years for browsers to support it.

Several alternative libraries, such as [scmp](https://www.npmjs.com/package/scmp) and [buffer-equal-constant-time](https://www.npmjs.com/package/buffer-equal-constant-time), use the "Bitwise comparison with XOR" pattern. While this should work in theory, it may not be effective in practice due to potential time leaks caused by the way [bits are implemented in JavaScript](https://github.com/soatok/constant-time-js#potentially-dangerous-on-32-bit-applications). Time-safe comparison with "Bitwise comparison with XOR" in [JavaScript is difficult to implement](https://github.com/nodejs/node/pull/38488) and [test](https://github.com/nodejs/node/issues/38226), and it cannot be guaranteed to be secure. The ideal solution would be to implement a safe function at a lower level, outside of JavaScript.

In the meantime, we can use the ["Double HMAC Verification"](https://web.archive.org/web/20140715054701/https://www.isecpartners.com/blog/2011/february/double-hmac-verification.aspx) pattern as a common alternative for time-constant comparison. This pattern compares two HMACs: `hmac(key, left) === hmac(key, right)`. In this case, it doesn't matter if `===` leaks length information, because the HMAC hashes constantly change. Therefore, even if the first byte of `hmac(key, left)` and `hmac(key, right)` matches, an attacker cannot rely on the assumption that they have correctly guessed it. Moving to the next byte will change the hash, effectively turning the attack into a brute-force attempt instead of a time-based one.

### Performance
The `webTimingSafeEqual` function runs about 110 times slower than `timingSafeEqual` method.
If you pre-generate a key or provide your own, then it's only 65 times slower than `timingSafeEqual` method.
```js
crypto.timingSafeEqual('a','b') // fastest
(async()=>{
  await webTimingSafeEqual('a', 'b'); // 110 times slower

  const secretKey = await generateSecretKey();
  await webTimingSafeEqual('a', 'b', {secretKey}); // 65 times slower
})()
```

## API

### `webTimingSafeEqual(left, right, [options])`
Asynchronous method
- `left`: (string | Uint8Array) - First value to compare
- `right`: (string | Uint8Array) - Second value to compare
- `options`: (object) - Optional configuration object
  - `secretKey`: (string | CryptoKey) - Optional HMAC key for comparison (default: auto-generated key)
  - `keyLength`: (integer) - Optional length in bytes of the auto-generated key (default: 64)
  - `keyAlgorithm`: ("SHA-1" | "SHA-256" | "SHA-384" | "SHA-512") - Optional hash algorithm for the key (default: "SHA-256")
  - `hmacAlgorithm`: ("SHA-1" | "SHA-256" | "SHA-384" | "SHA-512") - Optional hash algorithm for the HMAC (default: "SHA-256")

Returns a Promise that resolves to a boolean indicating whether the two values are equal.

### `generateSecretKey([options])`
Asynchronous method
- `options`: (object) - Optional configuration object
  - `keyLength`: (integer) - Length of key in bytes (default: 64)
  - `algorithm`: ("SHA-1" | "SHA-256" | "SHA-384" | "SHA-512") - Hash algorithm (default: "SHA-256")

Returns a Promise that resolves to a randomly generated HMAC secret key (CryptoKey).

### `hmac(secretKey, message, [algorithm])`
Asynchronous method
- `secretKey`: (string | Uint8Array | CryptoKey) - Secret key for HMAC computation
- `message`: (string | Uint8Array) - Message to compute the HMAC for
- `algorithm`: ("SHA-1" | "SHA-256" | "SHA-384" | "SHA-512") - Optional hash algorithm for HMAC (default: "SHA-256")

Returns a Promise that resolves to a hexadecimal digest of the HMAC computation.

## Security
This library implements the "Double HMAC verification" pattern to provide a timing-safe comparison of strings. However, it is crucial to understand that the security of your application depends on various factors, and using this library alone does not guarantee your application is secure from timing attacks. Please consult a security expert if you have concerns about the security of your application.