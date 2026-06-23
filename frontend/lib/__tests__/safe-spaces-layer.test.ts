// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { addSafeSpacesLayer } from '../safe-spaces-layer';

jest.mock('../public-env', () => ({
  PUBLIC_API_BASE_URL: 'https://api.safevix.test',
}));

describe('addSafeSpacesLayer', function() {
  beforeEach(function() {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('loads backend places response and adds a map layer', async function() {
    var fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        places: [
          {
            name: 'City Hospital',
            type: 'hospital',
            lat: 13.0827,
            lon: 80.2707,
            phone: '108',
          },
        ],
        count: 1,
        source: 'openstreetmap',
      }),
    });

    var map = {
      getSource: jest.fn(() => undefined),
      addSource: jest.fn(),
      addLayer: jest.fn(),
    };

    await addSafeSpacesLayer(map as any, 13.0827, 80.2707);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.safevix.test/api/v1/emergency/safe-spaces?lat=13.0827&lon=80.2707&radius=1000'
    );
    expect(map.addSource).toHaveBeenCalledWith('safe-spaces', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [80.2707, 13.0827] },
            properties: { name: 'City Hospital', type: 'hospital', phone: '108' },
          },
        ],
      },
    });
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'safe-spaces-circles' }));
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'safe-spaces-labels' }));
  });
});



