/// <reference types="node" />
import WebSocket from 'ws';
import { ZBClient } from 'zeebe-node';
import { JSONDoc } from 'zeebe-node';
import { ZBClientOptions } from 'zeebe-node/dist/lib/interfaces-published-contract';
import { ProcessOutcome } from './WebSocketAPI';
interface ZBAffinityClientOptions extends ZBClientOptions {
    affinityServiceUrl: string;
    affinityTimeout: number;
}
export declare class ZBAffinityClient extends ZBClient {
    affinityServiceUrl: string;
    affinityService: WebSocket;
    ws?: WebSocket;
    affinityCallbacks: {
        [processInstanceKey: string]: (processOutcome: ProcessOutcome) => void;
    };
    affinityTimeout: number;
    pingTimeout: NodeJS.Timer;
    constructor(gatewayAddress: string, options: ZBAffinityClientOptions);
    createAffinityWorker(taskType: string): Promise<void>;
    createProcessInstanceWithAffinity<Variables extends JSONDoc>({ bpmnProcessId, variables, cb, }: {
        bpmnProcessId: string;
        variables: Variables;
        version?: number;
        cb: (processOutcome: ProcessOutcome) => void;
    }): Promise<unknown>;
    waitForAffinity(): Promise<void>;
    private throwNoConnection;
    private createAffinityService;
    private heartbeat;
    private setUpConnection;
    private handleMessage;
}
export {};
