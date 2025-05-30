import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { clear } from 'idb-keyval';
import nodeFetch from 'node-fetch';
import { storageWrapper as storage } from '@dailydotdev/shared/src/lib/storageWrapper';
import type { NextRouter } from 'next/router';
import { structuredCloneJsonPolyfill } from '@dailydotdev/shared/src/lib/structuredClone';

process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_WEBAPP_URL = 'https://app.daily.dev/';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('next/dynamic', () => (func: () => Promise<any>) => {
  let component: any = null;
  func().then((module: any) => {
    component = module.default;
  });
  const DynamicComponent = (...args) => component(...args);
  DynamicComponent.displayName = 'LoadableComponent';
  DynamicComponent.preload = jest.fn();
  return DynamicComponent;
});

jest.mock('next/router', () => ({
  useRouter: jest.fn().mockImplementation(
    () =>
      ({
        query: {},
        events: {
          on: jest.fn(),
          off: jest.fn(),
        },
      } as unknown as NextRouter),
  ),
}));

beforeEach(() => {
  clear();
  storage.clear();
});

global.fetch = nodeFetch as any as typeof fetch;
/* eslint-enable @typescript-eslint/no-explicit-any */

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })),
});

Object.defineProperty(global, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
});

Object.defineProperty(global, 'scroll', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(global, 'open', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(global, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(global, 'TransformStream', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    backpressure: jest.fn(),
    readable: jest.fn(),
    writable: jest.fn(),
  })),
});

Object.defineProperty(global, 'BroadcastChannel', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readable: jest.fn(),
    writable: jest.fn(),
  })),
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}));

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    trigger: jest.fn(),
  })),
});

structuredCloneJsonPolyfill();
