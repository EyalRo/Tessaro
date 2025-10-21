import { fissionRequest } from "./client";

type MetricNumberResponse = {
  value: number;
};

type MetricTimestampResponse = {
  value: string | null;
};

export async function incrementMetric(key: string): Promise<number> {
  const { data } = await fissionRequest<MetricNumberResponse>("/tessaro/metrics/increment", {
    method: "POST",
    body: JSON.stringify({ key }),
  });

  return Number(data?.value ?? 0);
}

export async function setMetricTimestamp(key: string, timestamp?: string) {
  await fissionRequest("/tessaro/metrics/timestamp", {
    method: "POST",
    body: JSON.stringify({ key, value: timestamp ?? null }),
  });
}

export async function getMetricTimestamp(key: string): Promise<string | null> {
  const { status, data } = await fissionRequest<MetricTimestampResponse>(
    `/tessaro/metrics/timestamp?key=${encodeURIComponent(key)}`,
    {
      method: "GET",
      acceptStatuses: [404],
    },
  );

  if (status === 404) {
    return null;
  }

  return data?.value ?? null;
}

export async function setMetricNumber(key: string, value: number) {
  await fissionRequest("/tessaro/metrics/number", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

export async function getMetricNumber(key: string): Promise<number | null> {
  const { status, data } = await fissionRequest<MetricNumberResponse>(
    `/tessaro/metrics/number?key=${encodeURIComponent(key)}`,
    {
      method: "GET",
      acceptStatuses: [404],
    },
  );

  if (status === 404) {
    return null;
  }

  if (!data) {
    return null;
  }

  return Number(data.value);
}
