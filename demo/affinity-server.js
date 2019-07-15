// Zeebe Affinity Server
const { ZBAffinityServer } = require("../dst"); // require("zeebe-node-affinity");

const zbsPort = 8089;
const zbs = new ZBAffinityServer({ logLevel: "DEBUG" });
zbs.listen(zbsPort, () =>
  console.log(`Zeebe Affinity Server listening on port ${zbsPort}`)
);

setInterval(() => zbs.outputStats(), 1000 * 60 * 0.2);
