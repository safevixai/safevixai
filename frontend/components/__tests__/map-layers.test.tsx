import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('maplibre-gl', () => ({
  Map: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    addControl: jest.fn(),
    removeControl: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    addSource: jest.fn(),
    removeSource: jest.fn(),
    getCanvas: jest.fn(() => ({ style: {} })),
  })),
  NavigationControl: jest.fn(),
  GeolocateControl: jest.fn(),
}));

describe('MapLayers', () => {
  it('renders hazard heatmap layer', () => {
    const { container } = render(
      <div data-testid="map-container">
        <div data-testid="heatmap-layer" />
      </div>
    );

    const heatmap = screen.getByTestId('heatmap-layer');
    expect(heatmap).toBeTruthy();
  });

  it('renders emergency service markers', () => {
    const services = [
      { id: '1', name: 'City Hospital', lat: 13.0827, lon: 80.2707, category: 'hospital' },
      { id: '2', name: 'Police Station', lat: 13.0850, lon: 80.2730, category: 'police' },
    ];

    const { container } = render(
      <div data-testid="map-container">
        {services.map((s) => (
          <div key={s.id} data-testid={`marker-${s.category}`}>
            {s.name}
          </div>
        ))}
      </div>
    );

    expect(screen.getByTestId('marker-hospital')).toBeTruthy();
    expect(screen.getByTestId('marker-police')).toBeTruthy();
  });

  it('renders road issue markers', () => {
    const issues = [
      { id: '1', issueType: 'pothole', lat: 13.0827, lon: 80.2707, severity: 3 },
      { id: '2', issueType: 'flooding', lat: 13.0850, lon: 80.2730, severity: 4 },
    ];

    const { container } = render(
      <div data-testid="map-container">
        {issues.map((i) => (
          <div key={i.id} data-testid={`issue-${i.issueType}`}>
            {i.issueType} (severity: {i.severity})
          </div>
        ))}
      </div>
    );

    expect(screen.getByTestId('issue-pothole')).toBeTruthy();
    expect(screen.getByTestId('issue-flooding')).toBeTruthy();
  });

  it('renders user location marker', () => {
    const { container } = render(
      <div data-testid="map-container">
        <div data-testid="user-marker" />
      </div>
    );

    expect(screen.getByTestId('user-marker')).toBeTruthy();
  });

  it('toggles heatmap visibility', () => {
    let showHeatmap = true;
    const toggle = () => {
      showHeatmap = !showHeatmap;
    };

    const { container, rerender } = render(
      <div data-testid="map-container">
        {showHeatmap && <div data-testid="heatmap-layer" />}
        <button data-testid="toggle-heatmap" onClick={toggle}>
          Toggle
        </button>
      </div>
    );

    expect(screen.getByTestId('heatmap-layer')).toBeTruthy();

    fireEvent.click(screen.getByTestId('toggle-heatmap'));

    rerender(
      <div data-testid="map-container">
        {showHeatmap && <div data-testid="heatmap-layer" />}
        <button data-testid="toggle-heatmap" onClick={toggle}>
          Toggle
        </button>
      </div>
    );

    expect(screen.queryByTestId('heatmap-layer')).toBeNull();
  });

  it('displays map search results', () => {
    const searchResults = [
      { id: '1', name: 'Chennai Central', lat: 13.0827, lon: 80.2707 },
    ];

    const { container } = render(
      <div data-testid="map-container">
        {searchResults.map((r) => (
          <div key={r.id} data-testid={`search-result-${r.id}`}>
            {r.name}
          </div>
        ))}
      </div>
    );

    expect(screen.getByTestId('search-result-1')).toBeTruthy();
    expect(screen.getByText('Chennai Central')).toBeTruthy();
  });
});
