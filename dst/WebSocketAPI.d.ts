import WebSocket from "ws";
export declare enum AffinityAPIMessageType {
    WORKFLOW_OUTCOME = "WORKFLOW_OUTCOME",
    REGISTER_WORKER = "REGISTER_WORKER",
    REGISTER_CLIENT = "REGISTER_CLIENT"
}
export interface WorkflowOutcomeMessage {
    type: AffinityAPIMessageType.WORKFLOW_OUTCOME;
    workflowInstanceKey: string;
    variables: {
        [key: string]: string | number;
    };
}
export interface RegisterClientMessage {
    type: AffinityAPIMessageType.REGISTER_CLIENT;
}
export interface RegisterWorkerMessage {
    type: AffinityAPIMessageType.REGISTER_WORKER;
}
export interface WorkflowOutcome {
    workflowInstanceKey: string;
    variables: {
        [key: string]: string | number;
    };
}
export declare function registerWorker(ws: WebSocket): void;
export declare function registerClient(ws: WebSocket): void;
export declare function broadcastWorkflowOutcome(clients: WebSocket[], workflowOutcome: WorkflowOutcome): void;
export declare function demarshalWorkflowOutcome(data: any): WorkflowOutcome | undefined;
export declare function publishWorkflowOutcomeToAffinityService(workflowOutcome: WorkflowOutcome, ws: any): void;
