// Zeebe Affinity Server
const { ZBAffinityServer } = require("../dst"); // require("zeebe-node-affinity");

const zbsPort = 8089;
const zbs = new ZBAffinityServer();
zbs.listen(zbsPort, () =>
  console.log(`Zeebe Affinity Server listening on port ${zbsPort}`)
);

setTimeout(() => zbs.outputStats(), 1000 * 60 * 1);
