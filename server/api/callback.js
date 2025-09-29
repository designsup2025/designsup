const CONFIRMATION_URL = process.env.ST_CONFIRMATION_URL || "";

async function parseJsonBody(req) {
  return await new Promise((resolve, reject) => {
    try {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  try {
    const body = await parseJsonBody(req);
    const lifecycle = body?.lifecycle;
    console.log("[ST] lifecycle:", lifecycle);

    if (lifecycle === "CONFIRMATION") {
      if (!CONFIRMATION_URL) {
        console.warn("[ST] confirmationUrl missing in env");
        return sendJson(res, 400, { error: "confirmationUrl not configured" });
      }
      console.log("[ST] confirmationUrl => 200");
      return sendJson(res, 200, { targetUrl: CONFIRMATION_URL });
    }

    if (lifecycle === "INSTALL" || lifecycle === "UPDATE" || lifecycle === "UNINSTALL") {
      console.log(`[ST] ${lifecycle} received`);
      return sendJson(res, 200, { status: "OK" });
    }

    if (lifecycle === "CONFIGURATION") {
      const phase = body?.configurationData?.phase;
      console.log("[ST] CONFIGURATION phase:", phase);

      if (phase === "INITIALIZE") {
        return sendJson(res, 200, {
          configurationData: {
            initialize: {
              name: "Designsup",
              description: "디자인숩의 자동화 시스템 제어 어플리케이션입니다.",
              id: "designsup-smartapp",
              permissions: ["r:devices:*", "x:devices:*", "r:deviceprofiles:*"],
              firstPageId: "pageMain",
            },
          },
        });
      }

      if (phase === "PAGE") {
        const pageId = body.configurationData.pageId || "pageMain";

        return sendJson(res, 200, {
          configurationData: {
            page: {
              pageId,
              name: "Setup Page",
              nextPageId: null,
              previousPageId: null,
              complete: true,
              sections: [
                {
                  name: "Give this app a new display name",
                  settings: [
                    {
                      id: "appName",
                      name: "Name",
                      description: "Required",
                      type: "TEXT",
                      required: true,
                      defaultValue: "Designsup",
                    },
                  ],
                },
                {
                  name: "Select Devices",
                  settings: [
                    {
                      id: "switches",
                      name: "Choose switches",
                      description: "(Optional) You can select later",
                      type: "DEVICE",
                      // required: false라서 기기 등록 없이 임의 테스트 가능
                      required: false,
                      multiple: true,
                      capabilities: ["switch"],
                      permissions: ["r", "x"],
                    },
                  ],
                },
              ],
            },
          },
        });
      }

      console.warn("[ST] unsupported configuration phase:", phase);
      return sendJson(res, 400, { error: "unsupported configuration phase" });
    }

    if (lifecycle === "EVENT" || lifecycle === "EXECUTE") {
      console.log(`[ST] ${lifecycle} received`);
      return sendJson(res, 200, { status: "OK" });
    }

    console.warn("[ST] unsupported lifecycle:", lifecycle);
    return sendJson(res, 400, { error: "unsupported lifecycle" });
  } catch (err) {
    console.error("[ST] error:", err);
    return sendJson(res, 500, { error: "internal error" });
  }
};
