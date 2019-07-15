"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
var AffinityAPIMessageType;
(function (AffinityAPIMessageType) {
    AffinityAPIMessageType["WORKFLOW_OUTCOME"] = "WORKFLOW_OUTCOME";
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
function broadcastWorkflowOutcome(clients, workflowOutcome) {
    const message = Object.assign({ type: AffinityAPIMessageType.WORKFLOW_OUTCOME }, workflowOutcome);
    Object.values(clients).forEach(client => {
        if (client.readyState === ws_1.default.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}
exports.broadcastWorkflowOutcome = broadcastWorkflowOutcome;
function demarshalWorkflowOutcome(data) {
    const message = JSON.parse(data.toString());
    return (message.type = AffinityAPIMessageType.WORKFLOW_OUTCOME
        ? Object.assign({}, message, { type: undefined }) : undefined);
}
exports.demarshalWorkflowOutcome = demarshalWorkflowOutcome;
function publishWorkflowOutcomeToAffinityService(workflowOutcome, ws) {
    const workflowOutcomeMessage = Object.assign({ type: AffinityAPIMessageType.WORKFLOW_OUTCOME }, workflowOutcome);
    ws.send(JSON.stringify(workflowOutcomeMessage));
}
exports.publishWorkflowOutcomeToAffinityService = publishWorkflowOutcomeToAffinityService;
