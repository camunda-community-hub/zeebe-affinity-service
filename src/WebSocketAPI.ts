import WebSocket from "ws";
import { WorkflowOutcomeMessage } from "./WebSocketAPI";

export enum AffinityAPIMessageType {
  WORKFLOW_OUTCOME = "WORKFLOW_OUTCOME",
  REGISTER_WORKER = "REGISTER_WORKER",
  REGISTER_CLIENT = "REGISTER_CLIENT"
}

export interface WorkflowOutcomeMessage {
  type: AffinityAPIMessageType.WORKFLOW_OUTCOME;
  workflowInstanceKey: string;
  variables: { [key: string]: string | number };
}

export interface RegisterClientMessage {
  type: AffinityAPIMessageType.REGISTER_CLIENT;
}

export interface RegisterWorkerMessage {
  type: AffinityAPIMessageType.REGISTER_WORKER;
}

export interface WorkflowOutcome {
  workflowInstanceKey: string;
  variables: { [key: string]: string | number };
}

export function registerWorker(ws: WebSocket) {
  ws.send(JSON.stringify({ type: AffinityAPIMessageType.REGISTER_WORKER }));
}

export function registerClient(ws: WebSocket) {
  ws.send(JSON.stringify({ type: AffinityAPIMessageType.REGISTER_CLIENT }));
}

export function broadcastWorkflowOutcome(
  clients: { [uuid: string]: WebSocket },
  workflowOutcome: WorkflowOutcome
) {
  const message: WorkflowOutcomeMessage = {
    type: AffinityAPIMessageType.WORKFLOW_OUTCOME,
    ...workflowOutcome
  };
  Object.values(clients).forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

export function demarshalWorkflowOutcome(data): WorkflowOutcome | undefined {
  const message = JSON.parse(data.toString());
  return (message.type = AffinityAPIMessageType.WORKFLOW_OUTCOME
    ? { ...message, type: undefined }
    : undefined);
}

export function publishWorkflowOutcomeToAffinityService(
  workflowOutcome: WorkflowOutcome,
  ws
) {
  const workflowOutcomeMessage: WorkflowOutcomeMessage = {
    type: AffinityAPIMessageType.WORKFLOW_OUTCOME,
    ...workflowOutcome
  };
  ws.send(JSON.stringify(workflowOutcomeMessage));
}
