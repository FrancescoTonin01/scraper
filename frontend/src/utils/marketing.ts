const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function appendCurrentUtmParams(params: URLSearchParams): void {
  if (typeof window === "undefined") return;

  const currentParams = new URLSearchParams(window.location.search);
  UTM_KEYS.forEach((key) => {
    const value = currentParams.get(key);
    if (value && !params.has(key)) params.set(key, value);
  });
}

export function getMarketingEventProps(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const currentParams = new URLSearchParams(window.location.search);
  const props: Record<string, string> = {};

  UTM_KEYS.forEach((key) => {
    const value = currentParams.get(key);
    if (value) props[key] = value;
  });

  const ref = document.referrer;
  if (ref) props.referrer = ref;

  return props;
}
