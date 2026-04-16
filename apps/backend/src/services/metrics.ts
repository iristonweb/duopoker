const counters: Record<string, number> = {
  http_requests_total: 0
};

export const incRequestCount = () => {
  counters.http_requests_total += 1;
};

export const renderMetrics = () =>
  Object.entries(counters)
    .map(([k, v]) => `${k} ${v}`)
    .join('\n');
