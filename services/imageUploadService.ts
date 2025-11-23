
/**
 * Service to handle image uploads to ImageKit.io
 */

export const uploadImageToStorage = async (base64Image: string, fileName: string): Promise<string> => {
  try {
    // 1. Convert Base64 (Data URL) to Blob
    // Strip the prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    // Robust Base64 decoding
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });

    // 2. Prepare FormData
    const formData = new FormData();
    formData.append('file', blob, fileName); 
    formData.append('fileName', fileName);
    formData.append('useUniqueFileName', 'false'); 
    formData.append('folder', '/sciencesnap'); 

    // 3. Upload to ImageKit using Private Key
    // Note: In a production environment, private keys should typically be used on a backend server.
    const privateKey = 'private_WXNp8yUjqMtlBjspCGK4nedTr+o=';
    
    console.log("Attempting upload to ImageKit...");
    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(privateKey + ':')}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`ImageKit upload failed (${response.status}): ${errorText}`);
      console.warn("Falling back to local Base64 storage.");
      
      // FALLBACK: Return the original base64 string so the app doesn't break if upload fails.
      return base64Image;
    }

    const data = await response.json();
    if (data && data.url) {
        console.log("ImageKit upload successful:", data.url);
        return data.url;
    }
    
    throw new Error("Upload response missing URL");

  } catch (error: any) {
    console.error("Upload service warning:", error);
    // CRITICAL FALLBACK: If anything goes wrong (network, auth, CORS), 
    // return the base64 image so the user can still save to their gallery.
    return base64Image;
  }
};
