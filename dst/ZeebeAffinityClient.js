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
const AffinityServiceOpenTimeout = 2000;
class ZBAffinityClient extends zeebe_node_1.ZBClient {
    constructor(gatewayAddress, options) {
        super(gatewayAddress, options);
        if (!(options && options.affinityServiceUrl)) {
            this.throwNoConnectionConfigured();
        }
        this.affinityServiceUrl = options && options.affinityServiceUrl;
        this.affinityCallbacks = {};
        this.createAffinityService();
    }
    createAffinityWorker(taskType) {
        if (!this.affinityServiceUrl) {
            this.throwNoConnectionConfigured();
        }
        if (!this.affinityService) {
            this.throwNoConnection();
        }
        WebSocketAPI_1.registerWorker(this.affinityService);
        super.createWorker(uuid_1.v4(), taskType, (job, complete) => {
            WebSocketAPI_1.publishWorkflowOutcomeToAffinityService({
                workflowInstanceKey: job.jobHeaders.workflowInstanceKey,
                variables: job.variables
            }, this.affinityService);
            // TODO error handling and fail the job?
            complete.success();
        });
    }
    createWorkflowInstanceWithAffinity({ bpmnProcessId, variables, version, cb }) {
        const _super = Object.create(null, {
            createWorkflowInstance: { get: () => super.createWorkflowInstance }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.affinityServiceUrl && cb) {
                this.throwNoConnectionConfigured();
            }
            if (!this.affinityService) {
                // Wait two seconds for the Affinity service connection to be established...
                // This is to avoid the potential race condition on initialisation.
                yield new Promise(resolve => setTimeout(() => { }, AffinityServiceOpenTimeout));
                if (!this.affinityService) {
                    this.throwNoConnection();
                }
            }
            // TODO check for error creating workflow to prevent registering callback?
            const wfi = yield _super.createWorkflowInstance.call(this, bpmnProcessId, variables, version);
            if (this.affinityService) {
                this.affinityCallbacks[wfi.workflowInstanceKey] = cb; // Register callback for application code
            }
            return wfi;
        });
    }
    initialise(timeout = 2000) {
        return __awaiter(this, void 0, void 0, function* () {
            const sleep = waitTimeInMs => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
            const timeoutFn = setTimeout(() => {
                this.throwNoConnection();
            }, timeout);
            while (this.affinityService.readyState !== ws_1.default.OPEN) {
                yield sleep(500);
            }
            clearTimeout(timeoutFn);
        });
    }
    throwNoConnectionConfigured() {
        throw new Error("This ZBAffinityClient does not have a connection to a Zeebe Affinity Server configured, and cannot take a callback!");
    }
    throwNoConnection() {
        throw new Error(`This ZBAffinityClient has not established a connection to the Zeebe Affinity Server at ${this.affinityServiceUrl} and cannot take a callback!`);
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
