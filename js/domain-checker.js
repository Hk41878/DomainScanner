
(() => {
  const DNS_ONLY_EXTENSIONS = new Set(["it"]);
  const MAX_ACTIVE_REQUESTS = 20;
  const REQUEST_TIMEOUT_MS = 4000;
  const RETRIES = 1;
  const CACHE_TTL_MS = 60_000;

  let activeRequests = 0;
  const requestQueue = [];
  const resultCache = new Map();
  const inFlightChecks = new Map();

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function acquireRequestSlot() {
    if (activeRequests >= MAX_ACTIVE_REQUESTS) {
      await new Promise(resolve => requestQueue.push(resolve));
    }
    activeRequests++;
  }

  function releaseRequestSlot() {
    activeRequests--;
    const next = requestQueue.shift();
    if (next) next();
  }

  async function limitedFetch(url, options = {}) {
    await acquireRequestSlot();

    try {
      let lastError;

      for (let attempt = 0; attempt <= RETRIES; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS
        );

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal
          });

          if (
            (response.status === 429 || response.status >= 500) &&
            attempt < RETRIES
          ) {
            await wait(250 * (attempt + 1));
            continue;
          }

          if (response.status === 429 || response.status >= 500) {
            throw new Error(`Temporary lookup error (${response.status})`);
          }

          return response;
        } catch (error) {
          lastError = error;
          if (attempt < RETRIES) {
            await wait(250 * (attempt + 1));
          }
        } finally {
          clearTimeout(timeout);
        }
      }

      throw lastError || new Error("Lookup failed");
    } finally {
      releaseRequestSlot();
    }
  }

  async function checkDns(domain) {
    const types = ["A", "AAAA", "NS", "MX", "CNAME"];

    const results = await Promise.allSettled(
      types.map(async type => {
        const url = new URL("https://cloudflare-dns.com/dns-query");
        url.searchParams.set("name", domain);
        url.searchParams.set("type", type);

        const response = await limitedFetch(url, {
          headers: { Accept: "application/dns-json" }
        });

        if (!response.ok) {
          throw new Error(`DNS HTTP error (${response.status})`);
        }

        const data = await response.json();

        if (data.Status !== 0 && data.Status !== 3) {
          throw new Error(`DNS response status (${data.Status})`);
        }

        return data.Status === 0 &&
          Array.isArray(data.Answer) &&
          data.Answer.length > 0;
      })
    );

    const successful = results.filter(
      result => result.status === "fulfilled"
    );

    return {
      hasRecords: successful.some(result => result.value),
      allFailed: successful.length === 0
    };
  }

  async function checkRdap(domain) {
    const response = await limitedFetch(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      {
        headers: {
          Accept: "application/rdap+json, application/json"
        }
      }
    );

    if (response.status === 404) return "not-found";
    if (!response.ok) return "error";

    const data = await response.json();

    return data.objectClassName === "domain" || data.ldhName
      ? "registered"
      : "error";
  }

  async function performCheck(domain) {
    const dns = await checkDns(domain);

    if (dns.hasRecords) {
      return {
        emoji: "❌",
        message: "DNS record found.",
        type: "bad"
      };
    }

    const extension = domain.split(".").pop().toLowerCase();

    if (DNS_ONLY_EXTENSIONS.has(extension)) {
      return dns.allFailed
        ? {
            emoji: "⚪",
            message: "DNS lookup service unavailable.",
            type: "muted"
          }
        : {
            emoji: "🟡",
            message: "No DNS records found. This DNS-only result does not confirm availability.",
            type: "warn"
          };
    }

    let rdap;

    try {
      rdap = await checkRdap(domain);
    } catch (error) {
      console.warn("RDAP lookup failed:", domain, error);
      rdap = "error";
    }

    if (rdap === "registered") {
      return {
        emoji: "❌",
        message: "An RDAP domain record was found.",
        type: "bad"
      };
    }

    if (rdap === "not-found") {
      return {
        emoji: "🍀",
        message: dns.allFailed
          ? "RDAP reports no domain record, but DNS could not be verified. Confirm with a registrar."
          : "No DNS/RDAP domain record found. Confirm availability with a registrar.",
        type: "ok"
      };
    }

    return {
      emoji: "⚪",
      message: dns.allFailed
        ? "DNS and RDAP could not verify this domain."
        : "RDAP could not verify this domain.",
      type: "muted"
    };
  }

  async function check(domain, options = {}) {
    const normalizedDomain = String(domain || "")
      .trim()
      .toLowerCase();

    if (!normalizedDomain) {
      return {
        emoji: "⚪",
        message: "No domain provided.",
        type: "muted"
      };
    }

    const force = options.force === true;
    const cached = resultCache.get(normalizedDomain);

    // Force mode skips the cached result.
    if (
      !force &&
      cached &&
      cached.result.emoji !== "⚪" &&
      Date.now() - cached.time < CACHE_TTL_MS
    ) {
      return cached.result;
    }

    // Do not start duplicate simultaneous lookups.
    if (inFlightChecks.has(normalizedDomain)) {
      return inFlightChecks.get(normalizedDomain);
    }

    const checkPromise = performCheck(normalizedDomain)
      .catch(error => {
        console.error("Domain lookup error:", normalizedDomain, error);

        return {
          emoji: "⚪",
          message: "Unable to verify right now. A lookup service may be unavailable or blocked.",
          type: "muted"
        };
      })
      .then(result => {
        // Don't cache ⚪ results; they should be retried next time.
        if (result.emoji === "⚪") {
          resultCache.delete(normalizedDomain);
        } else {
          resultCache.set(normalizedDomain, {
            time: Date.now(),
            result
          });
        }

        return result;
      })
      .finally(() => {
        inFlightChecks.delete(normalizedDomain);
      });

    inFlightChecks.set(normalizedDomain, checkPromise);
    return checkPromise;
  }

  window.DomainChecker = { check };
})();
