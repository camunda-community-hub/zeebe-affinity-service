/* eslint-disable no-unused-vars */
import redis, { ClientOpts, RedisClient } from 'redis';
import { v4 as uuid } from 'uuid';
import { Duration, KeyedObject, ZBClient } from 'zeebe-node';
import { WorkflowOutcome } from "./WebSocketAPI";

// TODO: handle errors if missing parameters (example: workflow instance key)
// TODO: purge the service

export class RedisAffinity extends ZBClient {
    public subscriber: RedisClient;

    publisher: RedisClient;

    affinityCallbacks: {
        // eslint-disable-next-line no-unused-vars
        [workflowInstanceKey: string]: (workflowOutcome: WorkflowOutcome) => void;
    };

    constructor(gatewayAddress: string, redisOptions: ClientOpts) {
        super(gatewayAddress);

        this.subscriber = redis.createClient(redisOptions);
        this.publisher = redis.createClient(redisOptions);
        this.affinityCallbacks = {};

        this.subscriber.on('connected', (error) => {
            console.log('Subscriber connected');
        });
        this.publisher.on('connected', (error) => {
            console.log('Publisher connected');
        });
        this.subscriber.on('error', (error) => {
            console.error(error);
        });
        this.publisher.on('error', (error) => {
            console.error(error);
        });

        this.subscriber.on('message', (channel: string, message: string) => {
            console.log(`subscriber received message in channel ${channel}`);
            try {
                this.affinityCallbacks[channel](JSON.parse(message));
            } catch (err) {
                console.error(err);
            }
        });
    }

    async createAffinityWorker(taskType: string): Promise<void> {
        const workerId: string = uuid();

        // create worker (ZB client)
        super.createWorker(workerId, taskType, async (job, complete) => {
            console.log(`Publish message on channel: ${job.workflowInstanceKey}`);
            const updatedVars = {
                ...job?.variables,
                workflowInstanceKey: job?.workflowInstanceKey,
            };
            this.publisher.publish(job.workflowInstanceKey, JSON.stringify(updatedVars));
            await complete.success(updatedVars);
        });
    }

    async createWorkflowInstanceWithAffinity<Variables = KeyedObject>({
        bpmnProcessId,
        variables,
        cb,
    }: {
        bpmnProcessId: string;
        variables: Variables;
        cb: (workflowOutcome: WorkflowOutcome) => void;
    }): Promise<void> {
        try {
            // create workflow instance (ZB client)
            const wfi = await super.createWorkflowInstance(bpmnProcessId, variables);

            this.affinityCallbacks[wfi.workflowInstanceKey] = cb;

            this.subscriber.subscribe(wfi.workflowInstanceKey, () => {
                console.log(`Subscribe to channel ${wfi.workflowInstanceKey}`);
            });
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async publishMessageWithAffinity<Variables = KeyedObject>({
        correlationKey,
        messageId,
        name,
        variables,
        workflowInstanceKey,
        cb,
    }: {
        correlationKey: string;
        messageId: string;
        name: string;
        variables: Variables;
        workflowInstanceKey: string;
        cb: (workflowOutcome: WorkflowOutcome) => void;
    }): Promise<void> {
        await super.publishMessage({
            correlationKey,
            messageId,
            name,
            variables,
            timeToLive: Duration.seconds.of(10),
        });

        this.affinityCallbacks[workflowInstanceKey] = cb;

        // TODO: add error message if missing workflowInstanceKey
        this.subscriber.subscribe(workflowInstanceKey, () => {
            console.log(`Subscribe to channel ${workflowInstanceKey}`);
        });
    }

    cleanup(channel: string): void {
        console.log(
            `Unsubscribe from channel ${channel} and removing affinity callbacks.`,
        );
        this.subscriber.unsubscribe(channel);
        try {
            delete this.affinityCallbacks[channel];
        } catch (err) {
            console.error(err);
        }
    }
}
