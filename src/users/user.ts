import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT } from "../config";
import http from "http";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // State variables to store the last received and sent messages
  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  // Status route
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  // POST route to receive a message
  _user.post("/message", (req, res) => {
    const { message } = req.body as { message: string };

    // Update the lastReceivedMessage with the received message
    lastReceivedMessage = message;

    console.log(`User ${userId} received message: ${message}`);

    // Respond back with the message received
    res.send("success");
  });

  // GET route for last received message
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  // GET route for last sent message
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  // POST route for sending a message to another node (uses HTTP)
  _user.post("/sendMessage", (req, res) => {
    const { message, destinationUserId } = req.body as SendMessageBody;

    // Update lastSentMessage when a message is sent
    lastSentMessage = message;

    // Send the message to the entry node of the circuit using the HTTP module
    const postData = JSON.stringify({ message });

    const options = {
      hostname: "localhost",
      port: BASE_USER_PORT + destinationUserId, // The destination user port
      path: "/message", // Target path for the POST request
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const request = http.request(options, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        console.log(`Response from User ${destinationUserId}: ${data}`);
        // Respond back after successfully sending the message
        res.send("Message sent through the network");
      });
    });

    request.on("error", (error) => {
      console.error(`Error sending message: ${error}`);
      res.status(500).send("Failed to send message");
    });

    // Write data to request body
    request.write(postData);
    request.end();
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
