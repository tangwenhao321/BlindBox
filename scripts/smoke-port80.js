(async () => {
  const ehpay = await fetch("http://120.26.181.145/");
  const health = await fetch("http://120.26.181.145/test-api/actuator/health");
  const boxes = await fetch("http://120.26.181.145/test-api/front/mystery-box/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageNum: 1, pageSize: 5, query: {} }),
  });
  const hj = await health.json();
  const bj = await boxes.json();
  console.log("ehpay home", ehpay.status);
  console.log("mb health", hj.status);
  console.log("mb boxes", bj.code, (bj.result && bj.result.content && bj.result.content.length) || 0);
})();
