export async function getLiveMetrics() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/live/`,
    { cache: "no-store" } // IMPORTANT for real-time
  );

  if (!res.ok) {
    throw new Error("Failed to fetch metrics");
  }

  return res.json();
}
