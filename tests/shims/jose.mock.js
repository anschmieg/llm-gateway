// Minimal mock for 'jose' ESM package to satisfy tests
module.exports = {
  jwtVerify: async () => ({ payload: {} }),
  importJWK: async () => ({}),
};
