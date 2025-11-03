import { headers } from 'next/headers';

/**
 * Determines if the request is from a mobile device.
 * Uses the "x-device-type" header if available or falls back to User-Agent.
 * @returns {Promise<boolean>} - Returns true if the device is mobile, otherwise false.
 */
export const isMobileDevice = async (): Promise<boolean> => {
  const headersInstance = await headers();
  const deviceType = headersInstance.get('x-device-type');

  if (deviceType) return deviceType === 'mobile';

  // Fallback to User-Agent detection
  const userAgent = headersInstance.get('user-agent') || '';
  return /Mobile|Android|iP(hone|od|ad)|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent
  );
};
