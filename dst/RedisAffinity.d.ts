import { ZBClient } from 'zeebe-node';
import { KeyedObject } from 'zeebe-node/dist/lib/interfaces';
import { WorkflowOutcome } from "./WebSocketAPI";
import { ClientOpts } from 'redis';
export declare class RedisAffinity extends ZBClient {
    private subscriber;
    private publisher;
    private affinityCallbacks;
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
}
