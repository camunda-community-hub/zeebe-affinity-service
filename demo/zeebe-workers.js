/* eslint-disable @typescript-eslint/no-var-requires */
const { ZBClient } = require("zeebe-node");

// The normal workers don't need affinity, although you can use the same affinity client to avoid version mis-matches.
const zbc = new ZBClient("localhost:26500");

async function startZeebeWorkers() {
  // This normal task worker does not need affinity, so use the standard worker
  const taskWorker = zbc.createWorker(
    "worker1",
    "transform",
    (job, complete) => {
      complete.success({
        message: `Hello ${job.variables.name}!`
      });
    }
  );
}

startZeebeWorkers();
