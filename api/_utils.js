async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let s = '';
    req.on('data', c => (s += c));
    req.on('end', () => {
      try {
        resolve(s ? JSON.parse(s) : {});  // body 없으면 {} 반환
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj ?? {}));
}
function ok(res, obj) { send(res, 200, obj); }
function bad(res, msg, code = 400) { send(res, code, { error: msg }); }

module.exports = { readJson, ok, bad };
