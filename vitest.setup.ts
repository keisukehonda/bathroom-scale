import '@testing-library/jest-dom/vitest'

// Silence ResizeObserver missing warnings in jsdom environment
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  // @ts-expect-error - assign mock implementation
  globalThis.ResizeObserver = ResizeObserverMock
}
