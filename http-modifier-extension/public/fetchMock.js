(() => {
  const getRequestDetails = (input, init, environment) => {
    let rawUrl = input;
    let method = "GET";

    if (environment.Request && input instanceof environment.Request) {
      rawUrl = input.url;
      method = input.method;
    } else if (environment.URL && input instanceof environment.URL) {
      rawUrl = input.href;
    }

    if (init?.method) method = init.method;

    return {
      method: String(method).toUpperCase(),
      signal:
        init?.signal ??
        (environment.Request && input instanceof environment.Request
          ? input.signal
          : null),
      url: new environment.URL(String(rawUrl), environment.baseUrl).href,
    };
  };

  const createFetchMock = (nativeFetch, environment) => {
    const mockedFetch = async function (input, init) {
      const request = getRequestDetails(input, init, environment);
      const rule = environment.isDebuggerEnabled()
        ? null
        : globalThis.HttpModifierRules.findMatchingResponseRule(
            environment.getRules(),
            request.url,
            environment.baseUrl,
          );

      if (!rule) return nativeFetch.apply(this, arguments);

      await Promise.resolve();
      if (request.signal?.aborted) {
        throw new environment.DOMException(
          "The operation was aborted.",
          "AbortError",
        );
      }

      environment.sendLog({
        method: request.method,
        ruleId: rule.id,
        type: "fetch",
        url: request.url,
        mockResponse: {
          bodyLength: rule.responseBody.length,
          preview: rule.responseBody.slice(0, 100),
        },
      });

      return new environment.Response(rule.responseBody, {
        status: 200,
        statusText: "OK",
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
        },
      });
    };

    mockedFetch.toString = nativeFetch.toString.bind(nativeFetch);
    return mockedFetch;
  };

  globalThis.HttpModifierFetch = Object.freeze({ createFetchMock });
})();
