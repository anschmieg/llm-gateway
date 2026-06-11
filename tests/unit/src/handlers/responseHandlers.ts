export const responseHandler = jest.fn().mockResolvedValue({
  response: new Response('{}', { status: 200 }),
  originalResponseJson: null,
  responseJson: null,
});

export const afterRequestHookHandler = jest.fn(
  async (c: any, mappedResponse: Response) => mappedResponse
);
export const beforeRequestHookHandler = jest.fn(
  async (c: any, reqBody: any) => reqBody
);
