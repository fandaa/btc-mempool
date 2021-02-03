export const sleepMs = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * Automatically refetch asynchronous data.
 * Uses single request on concurrent access.
 */
export const autorefreshedMs = (intervalMs: number) =>
  async (
    { initial, query, autostart = true }: {
      initial?: any;
      query: Function;
      autostart?: Boolean;
    },
  ) => {
    let refetching = false;
    let loader: Promise<any> | null = null;
    let lastFetchError: any = null;
    let value: any = initial;
    let intervalId: number;

    const setValue = (val: any) => {
      value = val;
    };
    const getValue = () => value;
    // const clearValue = () => { value = null }

    const load = () => {
      loader = new Promise((resolve, reject) => {
        query().then(resolve).catch(reject);
      });

      return loader;
    };

    const fetchResult = async () => {
      try {
        if (refetching) {
          return await loader;
        }

        refetching = true;
        const res = await load();
        refetching = false;

        lastFetchError = undefined;

        return res;
      } catch (e) {
        lastFetchError = e;
        refetching = false;
        return value; // OR undefined?
      }
    };

    const start = () => {
      stop();
      intervalId = setInterval(async () => {
        setValue(await fetchResult());
      }, intervalMs);
    };

    const stop = () => {
      clearInterval(intervalId);
    };

    const restart = () => {
      stop();
      start();
    };

    const refetch = async () => {
      stop();
      setValue(await fetchResult());
      start();
      return getValue();
    };

    const hasError = () => {
      return !!lastFetchError;
    };
    const getError = () => {
      return lastFetchError;
    };

    if (autostart) {
      setValue(await fetchResult());
      start();
    }

    return {
      start,
      stop,
      restart,
      refetch,
      setValue,
      getValue,
      hasError,
      getError,
    };
  };
