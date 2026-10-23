
(() => {
  const DNS_ONLY_EXTENSIONS = new Set(["it"]);

  async function checkDns(domain) {
    const types = ["A", "AAAA", "NS", "MX", "CNAME"];

    const results = await Promise.allSettled(
      types.map(async type => {
        const url = new URL("https://cloudflare-dns.com/dns-query");
        url.searchParams.set("name", domain);
        url.searchParams.set("type", type);

        const response = await fetch(url, {
          headers: { Accept: "application/dns-json" }
        });

        if (!response.ok) throw new Error("DNS service unavailable");
        return response.json();
      })
    );

    return {
      hasRecords: results.some(result =>
        result.status === "fulfilled" &&
        Array.isArray(result.value.Answer) &&
        result.value.Answer.length > 0
      ),
      allFailed: results.every(result => result.status === "rejected")
    };
  }

  async function checkRdap(domain) {
    const response = await fetch(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      { headers: { Accept: "application/rdap+json, application/json" } }
    );

    if (response.status === 404) return "not-found";
    if (!response.ok) return "error";

    const data = await response.json();

    return data.objectClassName === "domain" || data.ldhName
      ? "registered"
      : "error";
  }

  async function check(domain) {
    try {
      const dns = await checkDns(domain);

      if (dns.allFailed) {
        return { emoji: "⚪", message: "DNS lookup service unavailable.", type: "muted" };
      }

      if (dns.hasRecords) {
        return { emoji: "❌", message: "DNS record found.", type: "bad" };
      }

      const extension = domain.split(".").pop();

      if (DNS_ONLY_EXTENSIONS.has(extension)) {
        return { emoji: "🟡", message: "No DNS record found. RDAP is not enabled for this extension.", type: "warn" };
      }

      const rdap = await checkRdap(domain);

      if (rdap === "registered") {
        return { emoji: "❌", message: "An RDAP domain record was found.", type: "bad" };
      }

      if (rdap === "not-found") {
        return { emoji: "🍀", message: "DNS or RDAP record not found. Confirm availability with a registrar.", type: "ok" };
      }

      return { emoji: "⚪", message: "RDAP could not verify this domain.", type: "muted" };
    } catch (error) {
      console.error("Domain lookup error:", error);
      return { emoji: "⚪", message: "Unable to verify right now. A lookup service may be unavailable or blocked.", type: "muted" };
    }
  }

  window.DomainChecker = { check };
})();
