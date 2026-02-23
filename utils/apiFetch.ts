
import { getAuthHeaders } from './apiUtils';

export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Retrieve token from localStorage for each API call to ensure it's the latest.
  const token = localStorage.getItem('authToken'); 

  const isFormData = options.body instanceof FormData;
  const authHeadersFromUtil = getAuthHeaders(token, isFormData);
  
  // Merge headers: default from getAuthHeaders, then options.headers (custom ones can override)
  const mergedHeaders = {
    ...authHeadersFromUtil, 
    ...(options.headers || {}), 
  };

  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
};
