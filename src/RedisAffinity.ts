/* eslint-disable no-unused-vars */
import redis, { ClientOpts, RedisClient } from 'redis';
import { Duration, KeyedObject, ZBClient } from 'zeebe-node';
import { ProcessOutcome } from './WebSocketAPI';

// TODO: handle errors if missing parameters (example: process instance key)
// TODO: purge the service

export class RedisAffinity extends ZBClient {
    public subscriber: RedisClient;

    publisher: RedisClient;

    affinityCallbacks: {
        // eslint-disable-next-line no-unused-vars
        [processInstanceKey: string]: (processOutcome: ProcessOutcome) => void;
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
        // create worker (ZB client)
        super.createWorker({
            taskType,
            taskHandler: async (job, _, worker) => {
                try {
                    console.log(
                        `Publish message on channel: ${job.processInstanceKey}`,
                    );
                    const updatedVars = {
                        ...job?.variables,
                        processInstanceKey: job?.processInstanceKey,
                    };
                    this.publisher.publish(
                        job.processInstanceKey,
                        JSON.stringify(updatedVars),
                    );
                    return await job.complete(updatedVars);
                } catch (error: any) {
                    console.error(
                        `Error while publishing message on channel: ${job.processInstanceKey}`,
                    );
                    return job.fail(error.message);
                }
            },
        });
    }

    async createProcessInstanceWithAffinity<Variables = KeyedObject>({
        bpmnProcessId,
        variables,
        cb,
    }: {
        bpmnProcessId: string;
        variables: Variables;
        cb: (processOutcome: ProcessOutcome) => void;
    }): Promise<void> {
        try {
            // create process instance (ZB client)
            const wfi = await super.createProcessInstance(
                bpmnProcessId,
                variables,
            );

            this.affinityCallbacks[wfi.processInstanceKey] = cb;

            this.subscriber.subscribe(wfi.processInstanceKey, () => {
                console.log(`Subscribe to channel ${wfi.processInstanceKey}`);
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
        processInstanceKey,
        cb,
    }: {
        correlationKey: string;
        messageId: string;
        name: string;
        variables: Variables;
        processInstanceKey: string;
        cb: (processOutcome: ProcessOutcome) => void;
    }): Promise<void> {
        await super.publishMessage({
            correlationKey,
            messageId,
            name,
            variables,
            timeToLive: Duration.seconds.of(10),
        });

        this.affinityCallbacks[processInstanceKey] = cb;

        // TODO: add error message if missing processInstanceKey
        this.subscriber.subscribe(processInstanceKey, () => {
            console.log(`Subscribe to channel ${processInstanceKey}`);
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
