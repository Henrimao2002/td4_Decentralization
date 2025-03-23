import bodyParser from "body-parser";
import express from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // Store registered nodes
  const nodes: Node[] = [];

  // Status route
  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  // Register a node on the registry
  _registry.post("/registerNode", (req, res) => {
    const { nodeId, pubKey } = req.body as RegisterNodeBody;

    // Add the node to the registry
    nodes.push({ nodeId, pubKey });
    console.log(`Node ${nodeId} registered with public key: ${pubKey}`);

    res.send("Node registered successfully");
  });

  // GET route for users to retrieve the node registry
  _registry.get("/getNodeRegistry", (_req, res) => {
    // Respond with the list of registered nodes
    res.json({ nodes });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}