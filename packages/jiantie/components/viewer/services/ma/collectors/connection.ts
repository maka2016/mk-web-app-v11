export default function () {
  const navigator = window.navigator as any;
  if (typeof navigator === 'undefined' || !navigator.connection) return {};
  return {
    connections: JSON.stringify({
      downlink: navigator.connection.downlink,
      effectiveType: navigator.connection.effectiveType,
      rtt: navigator.connection.rtt,
    }),
  };
}
