export function buildDeliveryTrackingSocketUrl(config: {
  get: (key: string) => string | number | undefined;
}): string {
  const configured =
    config.get('PUBLIC_API_URL') ??
    config.get('API_PUBLIC_URL') ??
    `http://localhost:${config.get('PORT') ?? 4000}`;

  return `${String(configured).replace(/\/$/, '')}/delivery-tracking`;
}
