/// <reference types="node" />
import WebSocket from "ws";
import { ZBClient } from "zeebe-node";
import { KeyedObject } from 'zeebe-node/dist/lib/interfaces';
import { ZBClientOptions } from 'zeebe-node/dist/lib/interfaces-published-contract';
import { WorkflowOutcome } from "./WebSocketAPI";
interface ZBAffinityClientOptions extends ZBClientOptions {
    affinityServiceUrl: string;
    affinityTimeout: number;
}
export declare class ZBAffinityClient extends ZBClient {
    affinityServiceUrl: string;
    affinityService: WebSocket;
    ws: any;
    affinityCallbacks: {
        [workflowInstanceKey: string]: (workflowOutcome: WorkflowOutcome) => void;
    };
    affinityTimeout: number;
    pingTimeout: NodeJS.Timer;
    constructor(gatewayAddress: string, options: ZBAffinityClientOptions);
    createAffinityWorker(taskType: string): Promise<void>;
    createWorkflowInstanceWithAffinity<Variables = KeyedObject>({ bpmnProcessId, variables, version, cb }: {
        bpmnProcessId: string;
        variables: Variables;
        version?: number;
        cb: (workflowOutcome: WorkflowOutcome) => void;
    }): Promise<import("zeebe-node/dist/lib/interfaces-grpc").CreateWorkflowInstanceResponse>;
    waitForAffinity(): Promise<void>;
    private throwNoConnection;
    private createAffinityService;
    private heartbeat;
    private setUpConnection;
    private handleMessage;
}
export {};
