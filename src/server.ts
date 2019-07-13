import dayjs from "dayjs";
import WebSocket from "ws";
import {
  AffinityAPIMessageType,
  broadcastWorkflowOutcome,
  RegisterClientMessage,
  RegisterWorkerMessage,
  WorkflowOutcomeMessage
} from "./WebSocketAPI";
const portFromEnv = process.env.ZEEBE_AFFINITY_SERVER_PORT;

const port = portFromEnv ? parseInt(portFromEnv) : 8089;

const statsFromEnv = process.env.ZEEBE_AFFINITY_SERVER_STATS_INTERVAL;
const STATS_INTERVAL = statsFromEnv ? parseInt(statsFromEnv) : 5; // minutes
/**
 * Client connects.
 * When it registers as a client (interest in workflow outcomes)
 * When a worker communicates a workflow outcome, we broadcast the workflow to all clients. They are responsible for determining
 * whether or not the workflow outcome is of interest to them.
 *
 * We could manage that in the server, with subscriptions for specific outcomes. However, this would multiple the roundtrips and the
 * CPU and memory usage of the server.
 */

let workerCount = 0;
const clients: WebSocket[] = [];

const wss = new WebSocket.Server({
  port,
  perMessageDeflate: false
});

console.log(`Zeebe Affinity Server listening on port ${port}`);

// TODO Handle connection failure and remove both clients and workers when they go away
wss.on("connection", ws => {
  ws.on("message", message => {
    const msg:
      | RegisterClientMessage
      | RegisterWorkerMessage
      | WorkflowOutcomeMessage = JSON.parse(message.toString());
    switch (msg.type) {
      case AffinityAPIMessageType.REGISTER_CLIENT:
        clients.push(ws);
        break;
      case AffinityAPIMessageType.REGISTER_WORKER:
        workerCount++;
        break;
      case AffinityAPIMessageType.WORKFLOW_OUTCOME:
        broadcastWorkflowOutcome(clients, msg);
        break;
    }
  });
});

function outputStats() {
  console.log(dayjs().format("{YYYY} MM-DDTHH:mm:ss SSS [Z] A")); // display
  console.log(`Worker count: ${workerCount}`);
  console.log(`Client count: ${clients.length}`);
  console.log(`CPU:`, process.cpuUsage());
  console.log(`Memory used:`, process.memoryUsage());
}

STATS_INTERVAL && setInterval(outputStats, STATS_INTERVAL * 60 * 1000);
