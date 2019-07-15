"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const ws_1 = __importDefault(require("ws"));
const zeebe_node_1 = require("zeebe-node");
const WebSocketAPI_1 = require("./WebSocketAPI");
class ZBAffinityClient extends zeebe_node_1.ZBClient {
    constructor(gatewayAddress, options) {
        super(gatewayAddress, options);
        if (!(options && options.affinityServiceUrl)) {
            throw new Error("This ZBAffinityClient constructor options must have a url for a Zeebe Affinity Server!");
        }
        this.affinityServiceUrl = options && options.affinityServiceUrl;
        this.affinityTimeout = (options && options.affinityTimeout) || 2000;
        this.affinityCallbacks = {};
        this.createAffinityService();
    }
    createAffinityWorker(taskType) {
        const _super = Object.create(null, {
            createWorker: { get: () => super.createWorker }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.affinityService.readyState !== ws_1.default.OPEN) {
                yield this.waitForAffinity();
            }
            WebSocketAPI_1.registerWorker(this.affinityService);
            _super.createWorker.call(this, uuid_1.v4(), taskType, (job, complete) => __awaiter(this, void 0, void 0, function* () {
                if (this.affinityService.readyState !== ws_1.default.OPEN) {
                    try {
                        yield this.waitForAffinity();
                    }
                    catch (e) {
                        return complete.failure(`Could not contact Affinity Server at ${this.affinityServiceUrl}`);
                    }
                }
                WebSocketAPI_1.publishWorkflowOutcomeToAffinityService({
                    workflowInstanceKey: job.jobHeaders.workflowInstanceKey,
                    variables: job.variables
                }, this.affinityService);
                complete.success();
            }));
        });
    }
    createWorkflowInstanceWithAffinity({ bpmnProcessId, variables, version, cb }) {
        const _super = Object.create(null, {
            createWorkflowInstance: { get: () => super.createWorkflowInstance }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.affinityService.readyState !== ws_1.default.OPEN) {
                yield this.waitForAffinity();
            }
            // TODO check for error creating workflow to prevent registering callback?
            const wfi = yield _super.createWorkflowInstance.call(this, bpmnProcessId, variables, version);
            if (this.affinityService) {
                this.affinityCallbacks[wfi.workflowInstanceKey] = cb; // Register callback for application code
            }
            return wfi;
        });
    }
    waitForAffinity() {
        return __awaiter(this, void 0, void 0, function* () {
            const sleep = waitTimeInMs => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
            const timeoutFn = setTimeout(() => {
                this.throwNoConnection();
            }, this.affinityTimeout);
            while (this.affinityService.readyState !== ws_1.default.OPEN) {
                yield sleep(200);
            }
            clearTimeout(timeoutFn);
        });
    }
    throwNoConnection() {
        throw new Error(`This ZBAffinityClient timed out establishing a connection to the Zeebe Affinity Server at ${this.affinityServiceUrl}!`);
    }
    createAffinityService() {
        if (!this.affinityServiceUrl) {
            return;
        }
        this.affinityService = new ws_1.default(this.affinityServiceUrl, {
            perMessageDeflate: false
        });
        this.affinityService.on("open", () => {
            WebSocketAPI_1.registerClient(this.affinityService);
            console.log(`Connected to Zeebe Affinity Service at ${this.affinityServiceUrl}`);
        });
        this.affinityService.on("message", data => {
            const outcome = WebSocketAPI_1.demarshalWorkflowOutcome(data);
            if (outcome) {
                const wfi = outcome.workflowInstanceKey;
                if (this.affinityCallbacks[wfi]) {
                    this.affinityCallbacks[wfi](outcome);
                    this.affinityCallbacks[wfi] = undefined; // Object.delete degrades performance with large objects
                }
            }
        });
    }
}
exports.ZBAffinityClient = ZBAffinityClient;
