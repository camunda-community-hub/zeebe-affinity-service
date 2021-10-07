"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZBAffinityServer = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const ws_1 = __importDefault(require("ws"));
const WebSocketAPI_1 = require("./WebSocketAPI");
const uuid = require("uuid");
function heartbeat() {
    this.isAlive = true;
}
class ZBAffinityServer {
    constructor(options) {
        this.workers = {};
        this.clients = {};
        this.connections = {};
        this.options = options || {};
        if (this.options.statsInterval) {
            setInterval(() => this.outputStats(), this.options.statsInterval);
        }
        this.logLevel = this.options.logLevel || 'INFO';
    }
    listen(port, cb) {
        this.wss = new ws_1.default.Server({
            port,
            perMessageDeflate: false,
        });
        this.removeDeadConnections = setInterval(() => {
            this.debug('Reaping dead connections');
            const reaper = (ws) => {
                this.debug({
                    ws: {
                        isAlive: ws.isAlive,
                        isClient: ws.isClient,
                        isWorker: ws.isWorker,
                    },
                });
                if (ws.isAlive === false) {
                    if (ws.isClient) {
                        delete this.clients[ws.uuid];
                    }
                    if (ws.isWorker) {
                        delete this.workers[ws.uuid];
                    }
                    delete this.connections[ws.uuid];
                    return ws.terminate();
                }
                ws.isAlive = false;
                ws.ping();
            };
            Object.values(this.connections).forEach(reaper);
        }, 30000);
        this.wss.on('connection', (w) => {
            const ws = w;
            ws.isAlive = true;
            ws.on('pong', heartbeat);
            ws.ping(); // @DEBUG
            ws.on('message', (message) => {
                const msg = JSON.parse(message.toString());
                switch (msg.type) {
                    case WebSocketAPI_1.AffinityAPIMessageType.REGISTER_CLIENT:
                        ws.isClient = true;
                        // eslint-disable-next-line no-case-declarations
                        const clientId = ws.uuid || uuid();
                        ws.uuid = clientId;
                        this.clients[clientId] = ws;
                        this.connections[clientId] = ws;
                        this.debug('New client connected');
                        break;
                    case WebSocketAPI_1.AffinityAPIMessageType.REGISTER_WORKER:
                        ws.isWorker = true;
                        // eslint-disable-next-line no-case-declarations
                        const workerId = ws.uuid || uuid();
                        ws.uuid = workerId;
                        this.workers[workerId] = ws;
                        this.connections[workerId] = ws;
                        this.debug('New worker connected');
                        break;
                    case WebSocketAPI_1.AffinityAPIMessageType.PROCESS_OUTCOME:
                        WebSocketAPI_1.broadcastProcessOutcome(this.clients, msg);
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
            time: dayjs_1.default().format('{YYYY} MM-DDTHH:mm:ss SSS [Z] A'),
            workerCount: Object.keys(this.workers).length,
            clientCount: Object.keys(this.clients).length,
            cpu: process.cpuUsage(),
            memory: process.memoryUsage(),
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
    log(...args) {
        console.log(args);
    }
    debug(...args) {
        if (this.logLevel === 'DEBUG') {
            console.log(args);
        }
    }
}
exports.ZBAffinityServer = ZBAffinityServer;
