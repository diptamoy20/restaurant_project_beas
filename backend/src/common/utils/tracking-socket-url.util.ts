export function buildDeliveryTrackingSocketUrl(config: {
  get: (key: string) => string | number | undefined;
}): string {
  const configured =
    config.get('DELIVERY_TRACKING_SOCKET_URL') ??
    `http://localhost:${config.get('PORT') ?? 4000}/delivery-tracking`;

  return String(configured).trim().replace(/\/+$/, '');
}
