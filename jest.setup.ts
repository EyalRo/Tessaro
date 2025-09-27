import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for libraries that rely on the Web APIs
import { TextEncoder, TextDecoder } from 'util';

if (!global.TextEncoder) {
  (global as any).TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
  (global as any).TextDecoder = TextDecoder as typeof global.TextDecoder;
}
