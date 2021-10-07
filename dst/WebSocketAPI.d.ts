import WebSocket from 'ws';
export declare enum AffinityAPIMessageType {
    PROCESS_OUTCOME = "PROCESS_OUTCOME",
    REGISTER_WORKER = "REGISTER_WORKER",
    REGISTER_CLIENT = "REGISTER_CLIENT"
}
export interface ProcessOutcomeMessage {
    type: AffinityAPIMessageType.PROCESS_OUTCOME;
    processInstanceKey: string;
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
export interface ProcessOutcome {
    processInstanceKey: string;
    variables: {
        [key: string]: string | number;
    };
}
export declare function registerWorker(ws: WebSocket): void;
export declare function registerClient(ws: WebSocket): void;
export declare function broadcastProcessOutcome(clients: {
    [uuid: string]: WebSocket;
}, processOutcome: ProcessOutcome): void;
export declare function demarshalProcessOutcome(data: any): ProcessOutcome | undefined;
export declare function publishProcessOutcomeToAffinityService(processOutcome: ProcessOutcome, ws: any): void;
