import dayjs from "dayjs";
import WebSocket from "ws";
import {
  AffinityAPIMessageType,
  broadcastWorkflowOutcome,
  RegisterClientMessage,
  RegisterWorkerMessage,
  WorkflowOutcomeMessage
} from "./WebSocketAPI";

interface ZBAffinityServerOptions {
  statsInterval?: number;
}
export class ZBAffinityServer {
  workers: WebSocket[] = [];
  clients: WebSocket[] = [];
  wss!: WebSocket.Server;
  options: ZBAffinityServerOptions;

  constructor(options?: ZBAffinityServerOptions) {
    this.options = options || {};
    if (this.options.statsInterval) {
      setInterval(() => this.outputStats(), this.options.statsInterval);
    }
  }

  listen(port: number, cb?: () => void) {
    this.wss = new WebSocket.Server({
      port,
      perMessageDeflate: false
    });
    // TODO Handle connection failure and remove both clients and workers when they go away
    this.wss.on("connection", ws => {
      ws.on("message", message => {
        const msg:
          | RegisterClientMessage
          | RegisterWorkerMessage
          | WorkflowOutcomeMessage = JSON.parse(message.toString());
        switch (msg.type) {
          case AffinityAPIMessageType.REGISTER_CLIENT:
            this.clients.push(ws);
            break;
          case AffinityAPIMessageType.REGISTER_WORKER:
            this.workers.push(ws);
            break;
          case AffinityAPIMessageType.WORKFLOW_OUTCOME:
            broadcastWorkflowOutcome(this.clients, msg);
            break;
        }
      });
    });
    if (cb) {
      cb();
    }
  }

  stats() {
    return {
      time: dayjs().format("{YYYY} MM-DDTHH:mm:ss SSS [Z] A"), // display
      workerCount: this.workers.length,
      clientCount: this.clients.length,
      cpu: process.cpuUsage(),
      memory: process.memoryUsage()
    };
  }

  outputStats() {
    const stats = this.stats();
    console.log(stats.time); // display
    console.log(`Worker count: ${stats.workerCount}`);
    console.log(`Client count: ${stats.clientCount}`);
    console.log(`CPU:`, stats.cpu);
    console.log(`Memory used:`, stats.memory);
  }
}
