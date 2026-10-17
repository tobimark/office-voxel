// Plain data: layouts/navigation can use these without importing Three.js.
export const furnitureSpec = Object.freeze({
  chair: Object.freeze({ w: .78, d: .78 }),
  desk: Object.freeze({ w: 2.55, d: 1.28 }),
  plant: Object.freeze({ w: .6, d: .6 }),
});

export const workstationSpecs = Object.freeze({
  'desk-classic': Object.freeze({ hasDesk: true, monitorId: 'monitor-tall' }),
  'desk-low': Object.freeze({ hasDesk: true, monitorId: 'monitor-wide' }),
  'seat-facing': Object.freeze({ hasDesk: false, monitorId: 'monitor-compact' }),
});

// Shape names describe reusable assets, independently of office presets.
export const monitorSpecs = Object.freeze({
  'monitor-tall': {
    base: {y:1.23,z:0,w:.5,h:.07,d:.32}, stem: {y:1.43,z:-.08,w:.09,h:.40,d:.09},
    housing: {y:1.70,z:-.06,w:1.05,h:.65,d:.10}, screen: {y:1.70,z:0,w:.94,h:.53},
  },
  'monitor-wide': {
    base: {y:.015,z:0,w:.34,h:.03,d:.22}, stem: {y:.195,z:-.09,w:.08,h:.32,d:.08},
    housing: {y:.485,z:-.04,w:1.05,h:.6,d:.09}, screen: {y:.485,z:.012,w:.94,h:.5},
  },
  'monitor-compact': {
    base: {y:.015,z:0,w:.34,h:.03,d:.22}, stem: {y:.195,z:-.09,w:.08,h:.32,d:.08},
    housing: {y:.485,z:-.04,w:1,h:.6,d:.09}, screen: {y:.485,z:.012,w:.92,h:.52},
  },
});
