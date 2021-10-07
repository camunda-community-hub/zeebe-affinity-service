"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisAffinity = void 0;
/* eslint-disable no-unused-vars */
const redis_1 = __importDefault(require("redis"));
const zeebe_node_1 = require("zeebe-node");
// TODO: handle errors if missing parameters (example: process instance key)
// TODO: purge the service
class RedisAffinity extends zeebe_node_1.ZBClient {
    constructor(gatewayAddress, redisOptions) {
        super(gatewayAddress);
        this.subscriber = redis_1.default.createClient(redisOptions);
        this.publisher = redis_1.default.createClient(redisOptions);
        this.affinityCallbacks = {};
        this.subscriber.on('connected', () => {
            console.log('Subscriber connected');
        });
        this.publisher.on('connected', () => {
            console.log('Publisher connected');
        });
        this.subscriber.on('error', (error) => {
            console.error(error);
        });
        this.publisher.on('error', (error) => {
            console.error(error);
        });
        this.subscriber.on('message', (channel, message) => {
            console.log(`subscriber received message in channel ${channel}`);
            try {
                this.affinityCallbacks[channel](JSON.parse(message));
            }
            catch (err) {
                console.error(err);
            }
        });
    }
    async createAffinityWorker(taskType) {
        // create worker (ZB client)
        super.createWorker({
            taskType,
            taskHandler: async (job) => {
                try {
                    console.log(`Publish message on channel: ${job.processInstanceKey}`);
                    const updatedVars = {
                        ...job?.variables,
                        processInstanceKey: job?.processInstanceKey,
                    };
                    this.publisher.publish(job.processInstanceKey, JSON.stringify(updatedVars));
                    return await job.complete(updatedVars);
                }
                catch (error) {
                    console.error(`Error while publishing message on channel: ${job.processInstanceKey}`);
                    return job.fail(error.message);
                }
            },
        });
    }
    async createProcessInstanceWithAffinity({ bpmnProcessId, variables, cb, }) {
        try {
            // create process instance (ZB client)
            const wfi = await super.createProcessInstance(bpmnProcessId, variables);
            this.affinityCallbacks[wfi.processInstanceKey] = cb;
            this.subscriber.subscribe(wfi.processInstanceKey, () => {
                console.log(`Subscribe to channel ${wfi.processInstanceKey}`);
            });
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async publishMessageWithAffinity({ correlationKey, messageId, name, variables, processInstanceKey, cb, }) {
        await super.publishMessage({
            correlationKey,
            messageId,
            name,
            variables,
            timeToLive: zeebe_node_1.Duration.seconds.of(10),
        });
        this.affinityCallbacks[processInstanceKey] = cb;
        // TODO: add error message if missing processInstanceKey
        this.subscriber.subscribe(processInstanceKey, () => {
            console.log(`Subscribe to channel ${processInstanceKey}`);
        });
    }
    cleanup(channel) {
        console.log(`Unsubscribe from channel ${channel} and removing affinity callbacks.`);
        this.subscriber.unsubscribe(channel);
        try {
            delete this.affinityCallbacks[channel];
        }
        catch (err) {
            console.error(err);
        }
    }
}
exports.RedisAffinity = RedisAffinity;
