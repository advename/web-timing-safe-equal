let subtleCrypto;

// Set subtleCrypto based on the environment (Node.js or browser)
if ("crypto" in global) {
  // Edge environment
  subtleCrypto = crypto.subtle;
} else if (typeof window === "undefined") {
  // Node.js environment
  const crypto = require("crypto");
  subtleCrypto = crypto.webcrypto.subtle;
} else {
  // Browser environment
  subtleCrypto = window.crypto.subtle;
}

/**
 * A timing-safe comparison function using the "Double HMAC verification" pattern.
 *
 * Inspired by:
 * @see https://web.archive.org/web/20140715054701/https://www.isecpartners.com/blog/2011/february/double-hmac-verification.aspx
 * @see https://paragonie.com/blog/2015/11/preventing-timing-attacks-on-string-comparison-with-double-hmac-strategy
 * @see https://github.com/soatok/constant-time-js/blob/89892822cc225d2f36e64cf7b4de12ebc6b61c49/lib/equals.ts#L22-L34
 *
 * @param {(string|Uint8Array)} left First value
 * @param {(string|Uint8Array)} right Second value
 * @param {object} [options] Optional options
 * @param {(string|CryptoKey)} [options.secretKey=CryptoKey] Optional: Provide your own HMAC key
 * @param {integer} [options.keyLength=64] Optional: Provide the lenght in bytes of the auto generated key
 * @param {("SHA-1", "SHA-256", "SHA-384", "SHA-512")} [options.keyAlgorithm="SHA-256"] Optional: Provide an algorithm
 * @param {("SHA-1", "SHA-256", "SHA-384", "SHA-512")} [options.hmacAlgorithm="SHA-256"] Optional: Provide an algorithm
 * @returns {boolean}
 */
async function webTimingSafeEqual(left, right, options = {}) {
  // Validate algorithms
  if (options?.keyAlgorithm) {
    validateAlgorithm(options?.keyAlgorithm);
  }
  if (options?.hmacAlgorithm) {
    validateAlgorithm(options?.hmacAlgorithm);
  }

  // Use or generate new secretKey with optional values
  const secretKey =
    options?.secretKey ||
    (await generateSecretKey({
      ...(options.keyAlgorithm ? options.keyAlgorithm : {}),
      ...(options.keyLength ? options.keyLength : {}),
    }));

  // Set subtleCrypto based on the environment (Node.js or browser)
  const leftUint8Array = validateValueOrConvertToUint8Array(left);
  const rightUint8Array = validateValueOrConvertToUint8Array(right);

  // Are the values the same size
  // Check if the lengths of the arrays are not equal or if they are equal to 0
  if (
    leftUint8Array.length !== rightUint8Array.length ||
    leftUint8Array.length === 0
  ) {
    // If the lengths are not equal, throw false
    return false;
  }

  // Parallelize HMAC computations
  const [leftHMAC, rightHMAC] = await Promise.all([
    hmac(
      secretKey,
      leftUint8Array,
      options?.hmacAlgorithm ? options.hmacAlgorithm : undefined
    ),
    hmac(
      secretKey,
      rightUint8Array,
      options?.hmacAlgorithm ? options.hmacAlgorithm : undefined
    ),
  ]);

  return leftHMAC === rightHMAC;
}

/**
 * Async HMAC method
 * @param {(string|Uint8Array|CryptoKey)} secretKey
 * @param {(string|Uint8Array)} message
 * @param {("SHA-1", "SHA-256", "SHA-384", "SHA-512")} [algorithm="SHA-256"] Hash Algorithm: https://developer.mozilla.org/en-US/docs/Web/API/HmacKeyGenParams
 * @returns {digestHex}
 */
async function hmac(secretKey, message, algorithm = "SHA-256") {
  // Validate algorithm
  validateAlgorithm(algorithm);

  // Validate or convert message, must be Uint8Array
  const messageUint8Array = validateValueOrConvertToUint8Array(message);

  // Validate secretKey or convert it:
  // - string -> Uint8Array
  // - UintArray -> CryptoKey
  let keyUint8Array = secretKey;
  if (secretKey?.constructor?.name !== "CryptoKey") {
    // Validate or Convert the secretKey to Uint8Array, but only if it isn't already a valid Crypto Key
    keyUint8Array = validateValueOrConvertToUint8Array(keyUint8Array);
  }
  let cryptoKey = secretKey;

  if (secretKey?.constructor?.name !== "CryptoKey") {
    // Convert the secret key string into a CryptoKey
    cryptoKey = await subtleCrypto.importKey(
      "raw",
      keyUint8Array,
      { name: "HMAC", hash: algorithm },
      false,
      ["sign"]
    );
  }
  // Sign the message with HMAC and the CryptoKey
  const signature = await subtleCrypto.sign(
    "HMAC",
    cryptoKey,
    messageUint8Array
  );

  // Convert the signature ArrayBuffer to a hex string
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

/**
 * Generate a random HMAC secret key
 * @param {object} [options]
 * @param {integer} [options.keyLength=64] Length of key in bytes
 * @param {("SHA-1", "SHA-256", "SHA-384", "SHA-512")} [options.algorithm="SHA-256"] Hash algorithm
 * @returns {CryptoKey}
 */
async function generateSecretKey({
  keyLength = 64,
  algorithm = "SHA-256",
} = {}) {
  // Validate algorithm
  validateAlgorithm(algorithm);

  // Generates by default a 64 byte (512 bit) key
  return await subtleCrypto.generateKey(
    {
      name: "HMAC",
      hash: { name: algorithm },
      ...(keyLength
        ? {
            length: keyLength * 8, //  (8 bit = 1 byte). Source: https://w3c.github.io/webcrypto/#dfn-HmacKeyAlgorithm
          }
        : {}),
    },
    true,
    ["sign"]
  );
}

/**
 * Validate if the string value is one of "SHA-1", "SHA-256", "SHA-384", "SHA-512"
 * @param {string} algorithm
 * @throws {Error} Invalid Hash algorithm
 */
function validateAlgorithm(algorithm) {
  // Validate algorithm
  const allowedAlgorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

  if (!allowedAlgorithms.includes(algorithm)) {
    throw new Error(`Invalid hash algorithm: '${algorithm}'`);
  }
}

/**
 * Check if value is of type Uint8Array or convert it to it
 * @param {(string|Uint8Array)} value
 * @returns {Uint8Array}
 */
function validateValueOrConvertToUint8Array(value) {
  if (
    !(
      typeof value === "string" ||
      value instanceof String ||
      value instanceof Uint8Array
    )
  ) {
    // Neither string nor Uint8Array
    throw new Error(
      `Invalid comparison value: ${value} of type ${typeof value} is not of type String or Uint8Array`
    );
  }
  if (!(value instanceof Uint8Array)) {
    const encoder = new TextEncoder();
    value = encoder.encode(value);
  }
  return value;
}

module.exports = {
  webTimingSafeEqual,
  generateSecretKey,
  hmac,
};
