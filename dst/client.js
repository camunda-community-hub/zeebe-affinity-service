"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const ws = new ws_1.default("ws://localhost:8089");
ws.on("open", function open() {
    ws.send(JSON.stringify({ type: "WORKFLOW_OUTCOME", wfi: "Hello" }));
    ws.emit("workflowOutcome", { workflowId: 1232 });
});
ws.on("message", function incoming(data) {
    console.log(data);
});
