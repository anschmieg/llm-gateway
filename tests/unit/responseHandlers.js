module.exports = {
  responseHandler: jest.fn().mockResolvedValue({
    response: new Response('{}', { status: 200 }),
    originalResponseJson: null,
    responseJson: null,
  }),
};
