import { ClientOpts, RedisClient } from 'redis';
import { KeyedObject, ZBClient } from 'zeebe-node';
import { WorkflowOutcome } from "./WebSocketAPI";
export declare class RedisAffinity extends ZBClient {
    subscriber: RedisClient;
    publisher: RedisClient;
    affinityCallbacks: {
        [workflowInstanceKey: string]: (workflowOutcome: WorkflowOutcome) => void;
    };
    constructor(gatewayAddress: string, redisOptions: ClientOpts);
    createAffinityWorker(taskType: string): Promise<void>;
    createWorkflowInstanceWithAffinity<Variables = KeyedObject>({ bpmnProcessId, variables, cb, }: {
        bpmnProcessId: string;
        variables: Variables;
        cb: (workflowOutcome: WorkflowOutcome) => void;
    }): Promise<void>;
    publishMessageWithAffinity<Variables = KeyedObject>({ correlationKey, messageId, name, variables, workflowInstanceKey, cb, }: {
        correlationKey: string;
        messageId: string;
        name: string;
        variables: Variables;
        workflowInstanceKey: string;
        cb: (workflowOutcome: WorkflowOutcome) => void;
    }): Promise<void>;
    cleanup(channel: string): void;
}
