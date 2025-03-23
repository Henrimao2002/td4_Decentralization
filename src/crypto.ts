import { webcrypto } from "crypto";

// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256",
    },
    true, // whether the keys are extractable
    ["encrypt", "decrypt"]
  );
  return { publicKey, privateKey };  // Return the actual keys here
}

// Export a crypto public key to a base64 string format
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("spki", key); // spki format for public keys
  return arrayBufferToBase64(exportedKey);
}

// Export a crypto private key to a base64 string format
export async function exportPrvKey(
  key: webcrypto.CryptoKey | null
): Promise<string | null> {
  if (key === null) return null;
  const exportedKey = await webcrypto.subtle.exportKey("pkcs8", key); // pkcs8 format for private keys
  return arrayBufferToBase64(exportedKey);
}

// Import a base64 string public key to its native format
export async function importPubKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return webcrypto.subtle.importKey(
    "spki", 
    keyBuffer, 
    { name: "RSA-OAEP", hash: "SHA-256" }, 
    true, 
    ["encrypt"]
  );
}

// Import a base64 string private key to its native format
export async function importPrvKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return webcrypto.subtle.importKey(
    "pkcs8", 
    keyBuffer, 
    { name: "RSA-OAEP", hash: "SHA-256" }, 
    true, 
    ["decrypt"]
  );
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt(
  b64Data: string,
  strPublicKey: string
): Promise<string> {
  const publicKey = await importPubKey(strPublicKey);
  const dataBuffer = base64ToArrayBuffer(b64Data);

  const encryptedData = await webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    dataBuffer
  );

  return arrayBufferToBase64(encryptedData);
}

// Decrypts a message using an RSA private key
export async function rsaDecrypt(
  data: string,
  privateKey: webcrypto.CryptoKey
): Promise<string> {
  const dataBuffer = base64ToArrayBuffer(data);

  const decryptedData = await webcrypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    dataBuffer
  );

  // Convert decrypted data to a Base64 string
  return arrayBufferToBase64(decryptedData);  // Return Base64 encoded string
}


// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  return webcrypto.subtle.generateKey(
    { name: "AES-CBC", length: 256 },  // Changed from AES-GCM to AES-CBC
    true, 
    ["encrypt", "decrypt"]
  );
}


// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exportedKey);
}

// Import a base64 string format to its crypto native format
export async function importSymKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  return webcrypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a message using a symmetric key
export async function symEncrypt(
  key: webcrypto.CryptoKey,
  data: string
): Promise<string> {
  // Encode the string data into a Uint8Array (for encryption)
  const encodedData = new TextEncoder().encode(data);

  // Generate a random 12-byte IV for AES-GCM (Initialization Vector)
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // Perform the encryption using the AES-GCM algorithm
  const encryptedData = await webcrypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    encodedData
  );

  // Convert the IV and encrypted data to Base64 for transmission
  const ivBase64 = arrayBufferToBase64(iv.buffer);
  const encryptedDataBase64 = arrayBufferToBase64(encryptedData);

  // Return the IV and encrypted data, combined with ":" separator
  return ivBase64 + ":" + encryptedDataBase64; 
}

// Decrypt a message using a symmetric key
export async function symDecrypt(
  strKey: string,
  encryptedData: string
): Promise<string> {
  const [ivBase64, encryptedBase64] = encryptedData.split(":");
  const iv = base64ToArrayBuffer(ivBase64);
  const encryptedBuffer = base64ToArrayBuffer(encryptedBase64);

  const key = await importSymKey(strKey);

  const decryptedData = await webcrypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    key,
    encryptedBuffer
  );

  return new TextDecoder().decode(decryptedData);
}
