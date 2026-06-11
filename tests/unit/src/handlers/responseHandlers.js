// Handlers shim used by ResponseService tests. Keeps behavior realistic and exposes jest.fn mocks
const responseHandlerImpl = jest.fn().mockResolvedValue({
  response: new Response('{}', { status: 200 }),
  originalResponseJson: null,
  responseJson: null,
});

const beforeRequestHookHandler = jest
  .fn()
  .mockImplementation(async (c, reqBody) => reqBody);
const afterRequestHookHandler = jest
  .fn()
  .mockImplementation(async (c, mappedResponse) => mappedResponse);

module.exports = {
  beforeRequestHookHandler,
  afterRequestHookHandler,
  responseHandler: responseHandlerImpl,
  // helpers for tests to inspect/override
  __impl: {
    responseHandler: responseHandlerImpl,
    beforeRequestHookHandler,
    afterRequestHookHandler,
  },
};
