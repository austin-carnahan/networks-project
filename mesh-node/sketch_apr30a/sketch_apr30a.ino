#include <painlessMesh.h>
// #include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <queue>
#include <ArduinoJson.h>

#define   MESH_SSID       "meshNetwork"
#define   MESH_PASSWORD   "meshPassword"
#define   MESH_PORT       5555

#define   AP_SSID         "ESP32-AP"
#define   AP_PASSWORD     "12345678"

std::queue<String> messageQueue;
painlessMesh  mesh;
Scheduler scheduler;
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

Task taskSendMessage(500, TASK_FOREVER, []() {
  if (!messageQueue.empty()) {
    String message = messageQueue.front();
    messageQueue.pop();

    mesh.sendBroadcast(message);
  }
});

void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);

  mesh.setDebugMsgTypes(ERROR | STARTUP);  // set debug messages types
  mesh.init(MESH_SSID, MESH_PASSWORD, MESH_PORT);
  mesh.onReceive(&receivedCallback);

  // Print the AP IP address
  Serial.print("AP IP address: ");
  Serial.println(mesh.getAPIP());

  mesh.onNewConnection([](uint32_t nodeId) {
    Serial.printf("New mesh connection from node %u\n", nodeId);
  });

  scheduler.addTask(taskSendMessage);
  taskSendMessage.enable();

  // Set up the WebSocket server
  ws.onEvent([](AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_CONNECT) {
      Serial.printf("Client connected: %u\n", client->id());
    } else if (type == WS_EVT_DISCONNECT) {
      Serial.printf("Client disconnected: %u\n", client->id());
    } else if (type == WS_EVT_DATA) {
      // Handle incoming message from websocket client
      DynamicJsonDocument doc(1024);
      deserializeJson(doc, (char*)data);
      JsonArray grid = doc.as<JsonArray>();
      Serial.printf("WEBSOCKET message received");
      Serial.println("");

      // String message = String((char*)data);
      // Serial.printf("Websocket message: %s\n", message.c_str());

      String message;
      serializeJson(grid, message);

      // queue the message to be sent across the mesh network
      messageQueue.push(message);

      // Broadcast the message to all WebSocket clients connected to this node
      
      server->textAll(message);
    }
  });


  // Add the WebSocket to the server
  server.addHandler(&ws);
  server.begin();

}

void loop() {
  mesh.update();
  scheduler.execute();
}

// Handle incoming messages on from the mesh network - send them to websocket clients
void receivedCallback(uint32_t from, String &msg) {
  // Serial.printf("Received from %u msg=%s\n", from, msg.c_str());
  Serial.printf("MESH message received");
  Serial.println("");
  ws.textAll(msg);

}
