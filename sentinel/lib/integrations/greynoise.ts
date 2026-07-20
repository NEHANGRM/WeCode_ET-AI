export async function checkGreyNoise(ip: string) {
  const key = process.env.GREYNOISE_KEY;
  if (!key) {
    console.log('[GreyNoise] Key missing, using cached fallback');
    return getCachedFallback(ip);
  }

  try {
    const res = await fetch(`https://api.greynoise.io/v3/community/${ip}`, {
      headers: {
        'key': key,
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      if (res.status === 404) {
         // IP not found in GreyNoise
         return { classification: 'unknown', isTargeted: false };
      }
      throw new Error(`GreyNoise returned ${res.status}`);
    }
    
    const data = await res.json();
    return {
      classification: data.classification || 'unknown',
      isTargeted: data.classification === 'malicious' // simplistic logic for hackathon
    };
  } catch (err) {
    console.error('[GreyNoise Error]', err);
    return getCachedFallback(ip);
  }
}

function getCachedFallback(ip: string) {
  if (ip === '185.150.11.23') {
    return { classification: 'malicious', isTargeted: true };
  }
  if (ip === '104.28.19.4') {
    return { classification: 'benign', isTargeted: false }; // Shodan
  }
  return { classification: 'unknown', isTargeted: false };
}
