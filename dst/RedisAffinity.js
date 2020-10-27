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
const redis_1 = __importDefault(require("redis"));
const uuid_1 = require("uuid");
const zeebe_node_1 = require("zeebe-node");
// TODO: handle errors if missing parameters (example: workflow instance key)
// TODO: purge the service
class RedisAffinity extends zeebe_node_1.ZBClient {
    constructor(gatewayAddress, redisOptions) {
        super(gatewayAddress);
        this.subscriber = redis_1.default.createClient(redisOptions);
        this.publisher = redis_1.default.createClient(redisOptions);
        this.affinityCallbacks = {};
        this.subscriber.on('error', function (error) {
            console.error(error);
        });
        this.publisher.on('error', function (error) {
            console.error(error);
        });
        this.subscriber.on('message', (channel, message) => {
            console.log('subscriber received message in channel ' + channel);
            this.subscriber.unsubscribe(channel);
            try {
                this.affinityCallbacks[channel](JSON.parse(message));
                delete this.affinityCallbacks[channel];
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
            const workerId = uuid_1.v4();
            // create worker (ZB client)
            _super.createWorker.call(this, workerId, taskType, (job, complete) => __awaiter(this, void 0, void 0, function* () {
                console.log('Publish message on channel: ' + job.workflowInstanceKey);
                this.publisher.publish(job.workflowInstanceKey, JSON.stringify(job.variables));
                complete.success();
            }));
        });
    }
    createWorkflowInstanceWithAffinity({ bpmnProcessId, variables, cb, }) {
        const _super = Object.create(null, {
            createWorkflowInstance: { get: () => super.createWorkflowInstance }
        });
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // create workflow instance (ZB client)
                const wfi = yield _super.createWorkflowInstance.call(this, bpmnProcessId, variables);
                this.affinityCallbacks[wfi.workflowInstanceKey] = cb;
                this.subscriber.subscribe(wfi.workflowInstanceKey, () => {
                    console.log('Subscribe to channel ' + wfi.workflowInstanceKey);
                });
            }
            catch (err) {
                console.error(err);
                throw err;
            }
        });
    }
    publishMessageWithAffinity({ correlationKey, messageId, name, variables, workflowInstanceKey, cb, }) {
        const _super = Object.create(null, {
            publishMessage: { get: () => super.publishMessage }
        });
        return __awaiter(this, void 0, void 0, function* () {
            _super.publishMessage.call(this, {
                correlationKey,
                messageId,
                name,
                variables,
                timeToLive: zeebe_node_1.Duration.seconds.of(10),
            });
            this.affinityCallbacks[workflowInstanceKey] = cb;
            // TODO: add error message if missing workflowInstanceKey
            this.subscriber.subscribe(workflowInstanceKey, () => {
                console.log('Subscribe to channel ' + workflowInstanceKey);
            });
        });
    }
}
exports.RedisAffinity = RedisAffinity;
