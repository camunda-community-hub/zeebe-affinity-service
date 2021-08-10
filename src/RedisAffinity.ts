import redis from 'redis';
import { v4 as uuid } from 'uuid';
import { ZBClient, Duration } from 'zeebe-node';
import { KeyedObject } from 'zeebe-node/dist/lib/interfaces';
import { WorkflowOutcome } from "./WebSocketAPI";

import { ClientOpts, RedisClient } from 'redis';

// TODO: handle errors if missing parameters (example: workflow instance key)
// TODO: purge the service

export class RedisAffinity extends ZBClient {
  private subscriber: RedisClient;
  private publisher: RedisClient;
  private affinityCallbacks: {
    [workflowInstanceKey: string]: (workflowOutcome: WorkflowOutcome) => void;
  };

  constructor(gatewayAddress: string, redisOptions: ClientOpts) {
    super(gatewayAddress);

    this.subscriber = redis.createClient(redisOptions);
    this.publisher = redis.createClient(redisOptions);
    this.affinityCallbacks = {};

    this.subscriber.on('error', function (error) {
      console.error(error);
    });
    this.publisher.on('error', function (error) {
      console.error(error);
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      console.log('subscriber received message in channel ' + channel);
      this.subscriber.unsubscribe(channel);
      try {
        this.affinityCallbacks[channel](JSON.parse(message));
        delete this.affinityCallbacks[channel];
      } catch (err) {
        console.error(err);
      }
    });
  }

  async createAffinityWorker(taskType: string) {
    const workerId: string = uuid();

    // create worker (ZB client)
    super.createWorker(workerId, taskType, async (job, complete) => {
      console.log('Publish message on channel: ' + job.workflowInstanceKey);
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
  }) {
    try {
      // create workflow instance (ZB client)
      const wfi = await super.createWorkflowInstance(bpmnProcessId, variables);

      this.affinityCallbacks[wfi.workflowInstanceKey] = cb;

      this.subscriber.subscribe(wfi.workflowInstanceKey, () => {
        console.log(
          'Subscribe to channel ' + wfi.workflowInstanceKey,
        );
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
  }) {
    super.publishMessage({
      correlationKey,
      messageId,
      name,
      variables,
      timeToLive: Duration.seconds.of(10),
    });

    this.affinityCallbacks[workflowInstanceKey] = cb;

    // TODO: add error message if missing workflowInstanceKey
    this.subscriber.subscribe(workflowInstanceKey, () => {
      console.log('Subscribe to channel ' + workflowInstanceKey);
    });
  }
}
