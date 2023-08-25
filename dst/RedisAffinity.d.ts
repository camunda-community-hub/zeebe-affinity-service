import { ClientOpts, RedisClient } from 'redis';
import { JSONDoc, ZBClient } from 'zeebe-node';
import { ProcessOutcome } from './WebSocketAPI';
export declare class RedisAffinity extends ZBClient {
    subscriber: RedisClient;
    publisher: RedisClient;
    affinityCallbacks: {
        [processInstanceKey: string]: (processOutcome: ProcessOutcome) => void;
    };
    constructor(gatewayAddress: string, redisOptions: ClientOpts);
    createAffinityWorker(taskType: string): Promise<void>;
    createProcessInstanceWithAffinity<Variables extends JSONDoc>({ bpmnProcessId, variables, cb, }: {
        bpmnProcessId: string;
        variables: Variables;
        cb: (processOutcome: ProcessOutcome) => void;
    }): Promise<void>;
    publishMessageWithAffinity<Variables extends JSONDoc>({ correlationKey, messageId, name, variables, processInstanceKey, cb, }: {
        correlationKey: string;
        messageId: string;
        name: string;
        variables: Variables;
        processInstanceKey: string;
        cb: (processOutcome: ProcessOutcome) => void;
    }): Promise<void>;
    cleanup(channel: string): void;
}
