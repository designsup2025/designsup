if (data.lifecycle === 'CONFIGURATION') {
  const phase = data.configurationData?.phase;
  console.log('[ST] CONFIGURATION phase:', phase);

  if (phase === 'INITIALIZE') {
    return json(res, {
      initialize: {
        id: 'config1',
        name: 'designsup',
        firstPageId: 'page1',
      },
    });
  }

  if (phase === 'PAGE') {
    return json(res, {
      page: {
        pageId: 'page1',
        name: 'Setup Page',
        complete: true,
        sections: [
          {
            name: 'Select Devices',
            settings: [
              {
                id: 'switches',
                name: 'Choose switches',
                description: 'Tap to select (optional)',
                type: 'DEVICE',
                required: false,
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

  return json(res, {});
}
