/**
 * Simple network connectivity check without external dependencies
 */
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    // Try to fetch a small resource to check connectivity
    // Using a HEAD request to minimize data transfer
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    console.log("📡 Checking network connectivity...");
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log(`📡 Network check result: ${response.ok ? 'Connected' : 'Failed'}`);
    return response.ok;
  } catch (error) {
    console.error("📡 Network appears to be down:", error);
    return false;
  }
}; 