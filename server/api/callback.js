import { NextResponse } from 'next/server';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error('[ST] invalid json body', err);
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  console.log('[ST] lifecycle:', body.lifecycle);

  if (body.lifecycle === 'PING') {
    return NextResponse.json({ pingData: body.pingData });
  }

  if (body.lifecycle === 'CONFIGURATION') {
    const phase = body.configurationData.phase;
    console.log('[ST] CONFIGURATION phase:', phase);

    if (phase === 'INITIALIZE') {
      return NextResponse.json({
        configurationData: {
          initialize: {
            id: 'app',
            name: 'Designsup',
            description: '디자인숩 테스트 SmartApp',
            permissions: ['r:devices:*', 'x:devices:*'],
            firstPageId: '1',
          },
        },
      });
    }

    if (phase === 'PAGE') {
      return NextResponse.json({
        configurationData: {
          page: {
            pageId: '1',
            name: 'Setup Page',
            nextPageId: null,
            previousPageId: null,
            complete: true,
            sections: [
              {
                name: 'Select Devices',
                settings: [
                  {
                    id: 'switches',
                    name: 'Choose switches',
                    description: 'Select switches to control',
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
        },
      });
    }
  }

  if (body.lifecycle === 'INSTALL') {
    console.log('[ST] INSTALL data:', body.installData);
    return NextResponse.json({ installData: {} });
  }

  if (body.lifecycle === 'UPDATE') {
    console.log('[ST] UPDATE data:', body.updateData);
    return NextResponse.json({ updateData: {} });
  }

  if (body.lifecycle === 'EVENT') {
    console.log('[ST] EVENT data:', body.eventData);
    return NextResponse.json({ eventData: {} });
  }

  return NextResponse.json({ error: 'Unsupported lifecycle' }, { status: 400 });
}
