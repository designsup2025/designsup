const { bufferJson } = require('./_utils'); // <= 이미 쓰던 유틸 (본문 파싱)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  let body;
  try {
    body = await bufferJson(req);
  } catch (e) {
    console.error('[ST] invalid json body', e);
    return res.status(400).json({ error: 'invalid json' });
  }

  const lifecycle = body.lifecycle;
  console.info('[ST] lifecycle:', lifecycle);

  try {
    switch (lifecycle) {
      case 'CONFIRMATION': {
        const url = body.confirmationData?.confirmationUrl;
        console.info('[ST] CONFIRMATION url:', url);
        return res.status(200).send({});
      }

      case 'CONFIGURATION': {
        const phase = body.configurationData?.phase;
        console.info('[ST] CONFIGURATION phase:', phase);

        if (phase === 'INITIALIZE') {
          return res.json({
            initialize: {
              id: 'config1',
              name: process.env.ST_CLIENT_NAME || 'designsup',
              firstPageId: 'page1',
            },
          });
        }

        if (phase === 'PAGE') {
          const pageId = body.configurationData?.pageId || 'page1';

          return res.json({
            page: {
              pageId,
              name: 'Select devices',
              nextPageId: null,
              previousPageId: null,
              complete: true,
              sections: [
                {
                  name: 'Switches to control',
                  settings: [
                    {
                      id: 'switches',
                      name: 'Choose switches',
                      description: 'Select one or more switches',
                      type: 'DEVICE',
                      required: true,
                      multiple: true,
                      capabilities: ['switch'],
                      permissions: ['r', 'x'],
                    },
                  ],
                },
              ],
            },
          });
        }

        return res.status(400).json({ error: 'unsupported configuration phase' });
      }

      case 'INSTALL': {
        console.info('[ST] INSTALL');
        return res.status(200).send({});
      }

      case 'UPDATE': {
        console.info('[ST] UPDATE');
        return res.status(200).send({});
      }

      case 'UNINSTALL': {
        console.info('[ST] UNINSTALL');
        return res.status(200).send({});
      }

      default:
        console.warn('[ST] unsupported lifecycle:', lifecycle);
        return res.status(400).json({ error: 'unsupported lifecycle' });
    }
  } catch (err) {
    console.error('[ST] handler error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
};
