const path = require('path');
// This mocks the jpeg-encoder-wasm module to ensure compatibility with CJS
// when using __importStar in generated TS code.
// We resolve to the actual CJS entry point.
const actualPath = path.resolve(__dirname, '../../node_modules/jpeg-encoder-wasm/pkg/cjs/index.cjs');
const actual = require(actualPath);

module.exports = {
  __esModule: true, // This tells __importStar to return the module as is
  ...actual,
  // Ensure default export is present
  default: actual.default
};
