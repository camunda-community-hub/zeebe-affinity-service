const { ZBAffinityClient } = require("../dst"); // require("zeebe-node-affinity");

const zbc = new ZBAffinityClient("localhost:26500", {
  affinityServiceUrl: "ws://localhost:8089" //  <- you need to run an Affinity server for this to work
});

zbc.createAffinityWorker("publish-outcome"); // <- put one of these tasks last in a workflow to publish the outcome
