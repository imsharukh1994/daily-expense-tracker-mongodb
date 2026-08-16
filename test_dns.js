const dns = require('dns');
dns.setServers(['8.8.8.8']);

async function test() {
  try {
    const res = await dns.promises.resolveSrv('_mongodb._tcp.cluster0.yaa5dpu.mongodb.net');
    console.log("SRV Success:", res);
  } catch (err) {
    console.error("SRV Error:", err);
  }
}
test();
