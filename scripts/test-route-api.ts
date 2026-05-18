// Test script for Yandex Routing API

const YANDEX_MAPS_API_KEY = 'ae07c673-4cea-4a08-bb10-0d6db1ad0a6c';

async function testRouteApi() {
  const fromLat = 55.7558;
  const fromLng = 37.6173;
  const toLat = 55.7515;
  const toLng = 37.6180;

  // Different Yandex Routing API endpoints to test
  const endpoints = [
    // Original endpoint from code
    `https://router.browser.yandex.net/v2?apikey=${YANDEX_MAPS_API_KEY}&mode=auto&origin=${fromLng},${fromLat}&destination=${toLng},${toLat}`,
    // Alternative endpoint
    `https://routing.api.cloud.yandex.net/directions/2.x?apikey=${YANDEX_MAPS_API_KEY}&mode=auto&origin=${fromLng},${fromLat}&destination=${toLng},${toLat}`,
    // Yandex Maps JS API style
    `https://yandex.ru/maps-route?apikey=${YANDEX_MAPS_API_KEY}&mode=auto&origin=${fromLng},${fromLat}&destination=${toLng},${toLat}`,
  ];
  
  console.log('Testing Yandex Routing API endpoints...\n');
  
  for (const url of endpoints) {
    console.log('Testing URL:', url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        console.log('Response not OK. Status:', response.status);
        const errorText = await response.text();
        console.log('Error response:', errorText.substring(0, 200));
      } else {
        const data = await response.json();
        console.log('Success! Response:', JSON.stringify(data, null, 2).substring(0, 200));
      }
    } catch (error: any) {
      console.error('Fetch error:', error.message || error);
    }
    console.log('---\n');
  }
  
  // Also test fallback calculation
  console.log('Testing fallback distance calculation...');
  const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
  console.log('Straight-line distance:', Math.round(distance), 'meters');
  console.log('Estimated duration:', Math.round(distance / 10) * 60, 'seconds');
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

testRouteApi();
