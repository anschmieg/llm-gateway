module.exports = {
  responseHandler: jest.fn().mockResolvedValue({
    response: new Response('{}', { status: 200 }),
    originalResponseJson: null,
    responseJson: null,
  }),
  afterRequestHookHandler: jest.fn(async (c, mappedResponse) => mappedResponse),
  beforeRequestHookHandler: jest.fn(async (c, reqBody) => reqBody),
};
