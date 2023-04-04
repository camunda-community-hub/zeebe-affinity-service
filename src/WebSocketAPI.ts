import WebSocket, { Data } from 'ws';

export enum AffinityAPIMessageType {
    PROCESS_OUTCOME = 'PROCESS_OUTCOME',
    REGISTER_WORKER = 'REGISTER_WORKER',
    REGISTER_CLIENT = 'REGISTER_CLIENT',
}

export interface ProcessOutcomeMessage {
    type: AffinityAPIMessageType.PROCESS_OUTCOME;
    processInstanceKey: string;
    variables: { [key: string]: string | number };
}

export interface RegisterClientMessage {
    type: AffinityAPIMessageType.REGISTER_CLIENT;
}

export interface RegisterWorkerMessage {
    type: AffinityAPIMessageType.REGISTER_WORKER;
}

export interface ProcessOutcome {
    processInstanceKey: string;
    variables: { [key: string]: string | number };
}

export function registerWorker(ws: WebSocket): void {
    ws.send(JSON.stringify({ type: AffinityAPIMessageType.REGISTER_WORKER }));
    return;
}

export function registerClient(ws: WebSocket): void {
    ws.send(JSON.stringify({ type: AffinityAPIMessageType.REGISTER_CLIENT }));
    return;
}

export function broadcastProcessOutcome(
    clients: { [uuid: string]: WebSocket },
    processOutcome: ProcessOutcome,
): void {
    const message: ProcessOutcomeMessage = {
        type: AffinityAPIMessageType.PROCESS_OUTCOME,
        ...processOutcome,
    };
    Object.values(clients).forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
    return;
}

export function demarshalProcessOutcome(data: Data): ProcessOutcome | undefined {
    const message = JSON.parse(data.toString());
    return (message.type = AffinityAPIMessageType.PROCESS_OUTCOME
        ? { ...message, type: undefined }
        : undefined);
}

export function publishProcessOutcomeToAffinityService(
    processOutcome: ProcessOutcome,
    ws: WebSocket,
) : void {
    const processOutcomeMessage: ProcessOutcomeMessage = {
        type: AffinityAPIMessageType.PROCESS_OUTCOME,
        ...processOutcome,
    };
    ws.send(JSON.stringify(processOutcomeMessage));
}
