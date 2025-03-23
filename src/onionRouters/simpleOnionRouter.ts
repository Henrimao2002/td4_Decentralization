import bodyParser from "body-parser";
import express from "express";
import crypto from "crypto";
import http from "http"; // Node's built-in http module
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";

// Function to register the node
async function registerNode(nodeId: number, publicKey: string) {
  // Strip the PEM headers and footers from the public key
  const strippedPublicKey = publicKey
    .replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "")
    .replace(/\s+/g, ""); // Remove any extra spaces or newlines

  // Log the public key for verification
  console.log("Stripped Public Key: ", strippedPublicKey);

  const data = JSON.stringify({
    nodeId,
    pubKey: strippedPublicKey, // Use the Base64 string of the public key
  });

  const options = {
    hostname: "localhost",
    port: REGISTRY_PORT,
    path: "/registerNode",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  const req = http.request(options, (res) => {
    res.on("data", (d) => {
      console.log(`Node ${nodeId} registered successfully:`, d.toString());
    });
  });

  req.on("error", (error) => {
    console.error(`Failed to register Node ${nodeId}:`, error);
  });

  req.write(data);
  req.end();
}

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // Generate RSA Key Pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  // State variables to store the last received messages and destination
  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;
  // Store the last circuit path (dummy data for illustration)
  let lastCircuit: number[] = [];

  // Register the node automatically with the registry
  await registerNode(nodeId, publicKey.toString());

  // Example route for getting the last circuit
  onionRouter.get("/getLastCircuit", (req, res) => {
    // Ensure the correct JSON format is returned
    res.json({ result: lastCircuit });
  });
  
  // Status route
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  // Route to get the private key (For Testing)
onionRouter.get("/getPrivateKey", (req, res) => {
  // Strip the PEM headers and footers from the private key
  const strippedPrivateKey = privateKey
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, ""); // Remove any extra spaces or newlines

  // Log the private key for verification
  console.log("Stripped Private Key: ", strippedPrivateKey);

  // Respond with the private key as Base64
  res.json({ result: strippedPrivateKey });
});


  // GET route for last received encrypted message
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  // GET route for last received decrypted message
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  // GET route for last message destination
  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
