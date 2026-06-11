// Test shim to satisfy jest.mock('../../responseHandlers') in ResponseService tests
// Provide realistic implementation of responseHandler signature and expose jest.fn to allow test overrides
const responseHandlerImpl = jest.fn().mockResolvedValue({
  response: new Response('{}', { status: 200 }),
  originalResponseJson: null,
  responseJson: null,
});

module.exports = {
  beforeRequestHookHandler: jest
    .fn()
    .mockImplementation(async (c, reqBody) => reqBody),
  afterRequestHookHandler: jest
    .fn()
    .mockImplementation(async (c, mappedResponse) => mappedResponse),
  responseHandler: responseHandlerImpl,
  // expose the impl so tests can reset/override easily
  __impl: {
    responseHandler: responseHandlerImpl,
  },
};
