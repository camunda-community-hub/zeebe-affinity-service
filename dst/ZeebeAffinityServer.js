"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dayjs_1 = __importDefault(require("dayjs"));
const ws_1 = __importDefault(require("ws"));
const WebSocketAPI_1 = require("./WebSocketAPI");
class ZBAffinityServer {
    constructor(options) {
        this.workers = [];
        this.clients = [];
        this.options = options || {};
        if (this.options.statsInterval) {
            setInterval(() => this.outputStats(), this.options.statsInterval);
        }
    }
    listen(port, cb) {
        this.wss = new ws_1.default.Server({
            port,
            perMessageDeflate: false
        });
        // TODO Handle connection failure and remove both clients and workers when they go away
        this.wss.on("connection", ws => {
            ws.on("message", message => {
                const msg = JSON.parse(message.toString());
                switch (msg.type) {
                    case WebSocketAPI_1.AffinityAPIMessageType.REGISTER_CLIENT:
                        this.clients.push(ws);
                        break;
                    case WebSocketAPI_1.AffinityAPIMessageType.REGISTER_WORKER:
                        this.workers.push(ws);
                        break;
                    case WebSocketAPI_1.AffinityAPIMessageType.WORKFLOW_OUTCOME:
                        WebSocketAPI_1.broadcastWorkflowOutcome(this.clients, msg);
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
            time: dayjs_1.default().format("{YYYY} MM-DDTHH:mm:ss SSS [Z] A"),
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
exports.ZBAffinityServer = ZBAffinityServer;
