import assert from "node:assert/strict";
import {
  formatDuration,
  getJobTotalTime,
  getRequestTotalTime,
  getTopBottlenecks,
} from "./app.js";

const sampleJob = {
  summary: {
    tradeQuery: 920,
    vmCreate: 2800,
    pricing: 9400,
    vmReclaim: 1200,
    resultIngest: 1500,
    postProcess: 1800,
  },
  requests: [
    {
      steps: {
        dataPrepare: 750,
        calculate: 5200,
        cleanup: 360,
      },
    },
  ],
};

assert.equal(getJobTotalTime(sampleJob), 17620);
assert.equal(getRequestTotalTime(sampleJob.requests[0]), 6310);
assert.deepEqual(getTopBottlenecks(sampleJob.summary, 3).map((step) => step.key), [
  "pricing",
  "vmCreate",
  "postProcess",
]);
assert.equal(formatDuration(17620), "17.6s");
assert.equal(formatDuration(920), "920ms");

console.log("timing helpers ok");
