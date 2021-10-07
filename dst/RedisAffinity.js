"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    createAffinityWorker(taskType) {
        const _super = Object.create(null, {
            createWorker: { get: () => super.createWorker }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // create worker (ZB client)
            _super.createWorker.call(this, {
                taskType,
                taskHandler: (job, _, worker) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        console.log(`Publish message on channel: ${job.processInstanceKey}`);
                        const updatedVars = Object.assign(Object.assign({}, job === null || job === void 0 ? void 0 : job.variables), { processInstanceKey: job === null || job === void 0 ? void 0 : job.processInstanceKey });
                        this.publisher.publish(job.processInstanceKey, JSON.stringify(updatedVars));
                        return yield job.complete(updatedVars);
                    }
                    catch (error) {
                        console.error(`Error while publishing message on channel: ${job.processInstanceKey}`);
                        return job.fail(error.message);
                    }
                }),
            });
        });
    }
    createProcessInstanceWithAffinity({ bpmnProcessId, variables, cb, }) {
        const _super = Object.create(null, {
            createProcessInstance: { get: () => super.createProcessInstance }
        });
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // create process instance (ZB client)
                const wfi = yield _super.createProcessInstance.call(this, bpmnProcessId, variables);
                this.affinityCallbacks[wfi.processInstanceKey] = cb;
                this.subscriber.subscribe(wfi.processInstanceKey, () => {
                    console.log(`Subscribe to channel ${wfi.processInstanceKey}`);
                });
            }
            catch (err) {
                console.error(err);
                throw err;
            }
        });
    }
    publishMessageWithAffinity({ correlationKey, messageId, name, variables, processInstanceKey, cb, }) {
        const _super = Object.create(null, {
            publishMessage: { get: () => super.publishMessage }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.publishMessage.call(this, {
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
