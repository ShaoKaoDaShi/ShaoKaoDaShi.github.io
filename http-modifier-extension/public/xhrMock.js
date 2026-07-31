(() => {
  const createXhrMock = (NativeXhr, environment) => {
    const rulesContract =
      environment.rulesContract || globalThis.HttpModifierRules;
    if (typeof rulesContract?.findMatchingResponseRule !== "function") {
      throw new Error("HTTP Modifier rule contract is unavailable.");
    }

    const MockXhr = function () {
      const xhr = new NativeXhr();
      const nativeOpen = xhr.open;
      const nativeSend = xhr.send;
      const nativeAbort = xhr.abort;
      let request = null;
      let synthetic = null;
      let sendStarted = false;
      let syntheticGeneration = 0;

      const dispatch = (type) => xhr.dispatchEvent(new environment.Event(type));
      const setValue = (name, value) => {
        Object.defineProperty(xhr, name, {
          configurable: true,
          get: () => value,
        });
      };
      const clearResponse = (readyState) => {
        setValue("readyState", readyState);
        setValue("status", 0);
        setValue("statusText", "");
        setValue("responseURL", "");
        setValue("responseText", "");
        setValue("response", null);
      };
      const failSynthetic = (generation) => {
        queueMicrotask(() => {
          if (
            generation !== syntheticGeneration ||
            !synthetic ||
            synthetic.aborted
          ) {
            return;
          }
          clearResponse(4);
          dispatch("readystatechange");
          dispatch("error");
          dispatch("loadend");
        });
      };

      xhr.open = function (method, url, async = true) {
        const result = nativeOpen.apply(this, arguments);
        syntheticGeneration += 1;
        request = {
          async,
          method: String(method || "GET").toUpperCase(),
          url: new environment.URL(String(url), environment.baseUrl).href,
        };
        sendStarted = false;
        synthetic = null;
        return result;
      };

      xhr.send = function () {
        if (sendStarted) {
          throw new environment.DOMException(
            "The object's state must be OPENED.",
            "InvalidStateError",
          );
        }

        const rule =
          request && !environment.isDebuggerEnabled()
            ? rulesContract.findMatchingResponseRule(
                environment.getRules(),
                request.url,
                environment.baseUrl,
              )
            : null;

        if (!rule) return nativeSend.apply(this, arguments);

        sendStarted = true;
        const generation = ++syntheticGeneration;
        synthetic = { aborted: false, generation };

        if (request.async === false) {
          console.error(
            "HTTP Modifier: Synchronous XHR mocking is unsupported.",
          );
          failSynthetic(generation);
          return;
        }

        if (!["", "text", "json"].includes(xhr.responseType)) {
          failSynthetic(generation);
          return;
        }

        environment.sendLog({
          method: request.method,
          ruleId: rule.id,
          type: "xhr",
          url: request.url,
          mockResponse: {
            bodyLength: rule.responseBody.length,
            preview: rule.responseBody.slice(0, 100),
          },
        });

        queueMicrotask(() => {
          if (
            generation !== syntheticGeneration ||
            !synthetic ||
            synthetic.aborted
          ) {
            return;
          }
          setValue("readyState", 4);
          setValue("status", 200);
          setValue("statusText", "OK");
          setValue("responseURL", request.url);
          if (xhr.responseType !== "json") {
            setValue("responseText", rule.responseBody);
          }
          setValue(
            "response",
            xhr.responseType === "json"
              ? JSON.parse(rule.responseBody)
              : rule.responseBody,
          );
          dispatch("readystatechange");
          dispatch("load");
          dispatch("loadend");
        });
      };

      xhr.abort = function () {
        if (!synthetic) return nativeAbort.apply(this, arguments);
        if (synthetic.aborted || xhr.readyState === 4) return;

        synthetic.aborted = true;
        clearResponse(0);
        dispatch("readystatechange");
        dispatch("abort");
        dispatch("loadend");
      };

      xhr.getResponseHeader = function (name) {
        if (!synthetic || xhr.readyState !== 4) {
          return (
            NativeXhr.prototype.getResponseHeader?.apply(this, arguments) ??
            null
          );
        }
        return String(name).toLowerCase() === "content-type"
          ? "application/json"
          : null;
      };

      xhr.getAllResponseHeaders = function () {
        if (!synthetic || xhr.readyState !== 4) {
          return (
            NativeXhr.prototype.getAllResponseHeaders?.apply(this, arguments) ??
            ""
          );
        }
        return "content-type: application/json\r\ncache-control: no-store\r\n";
      };

      return xhr;
    };

    Object.getOwnPropertyNames(NativeXhr).forEach((name) => {
      if (["length", "name", "prototype"].includes(name)) return;
      Object.defineProperty(
        MockXhr,
        name,
        Object.getOwnPropertyDescriptor(NativeXhr, name),
      );
    });
    MockXhr.prototype = NativeXhr.prototype;
    MockXhr.toString = NativeXhr.toString.bind(NativeXhr);
    return MockXhr;
  };

  globalThis.HttpModifierXhr = Object.freeze({ createXhrMock });
})();
