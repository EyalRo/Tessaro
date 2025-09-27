import React, { useState, useCallback } from 'react';

const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, onUploadComplete: (url: string) => void) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Simulate file upload with progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(i);
      }

      // In a real app, this would call the storage API
      // For now, we'll use a mock URL
      const mockUrl = URL.createObjectURL(file);
      onUploadComplete(mockUrl);
    } catch (error) {
      setUploadError('Failed to upload file. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setUploadError(null);
  }, []);

  return {
    uploading,
    uploadProgress,
    uploadError,
    uploadFile,
    clearError
  };
};

export default useFileUpload;
