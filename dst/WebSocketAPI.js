"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishProcessOutcomeToAffinityService = exports.demarshalProcessOutcome = exports.broadcastProcessOutcome = exports.registerClient = exports.registerWorker = exports.AffinityAPIMessageType = void 0;
const ws_1 = __importDefault(require("ws"));
var AffinityAPIMessageType;
(function (AffinityAPIMessageType) {
    AffinityAPIMessageType["PROCESS_OUTCOME"] = "PROCESS_OUTCOME";
    AffinityAPIMessageType["REGISTER_WORKER"] = "REGISTER_WORKER";
    AffinityAPIMessageType["REGISTER_CLIENT"] = "REGISTER_CLIENT";
})(AffinityAPIMessageType = exports.AffinityAPIMessageType || (exports.AffinityAPIMessageType = {}));
function registerWorker(ws) {
    ws.send(JSON.stringify({ type: AffinityAPIMessageType.REGISTER_WORKER }));
}
exports.registerWorker = registerWorker;
function registerClient(ws) {
    ws.send(JSON.stringify({ type: AffinityAPIMessageType.REGISTER_CLIENT }));
}
exports.registerClient = registerClient;
function broadcastProcessOutcome(clients, processOutcome) {
    const message = Object.assign({ type: AffinityAPIMessageType.PROCESS_OUTCOME }, processOutcome);
    Object.values(clients).forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}
exports.broadcastProcessOutcome = broadcastProcessOutcome;
function demarshalProcessOutcome(data) {
    const message = JSON.parse(data.toString());
    return (message.type = AffinityAPIMessageType.PROCESS_OUTCOME ? Object.assign(Object.assign({}, message), { type: undefined }) : undefined);
}
exports.demarshalProcessOutcome = demarshalProcessOutcome;
function publishProcessOutcomeToAffinityService(processOutcome, ws) {
    const processOutcomeMessage = Object.assign({ type: AffinityAPIMessageType.PROCESS_OUTCOME }, processOutcome);
    ws.send(JSON.stringify(processOutcomeMessage));
}
exports.publishProcessOutcomeToAffinityService = publishProcessOutcomeToAffinityService;
