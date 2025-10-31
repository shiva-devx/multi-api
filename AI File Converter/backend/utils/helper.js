import fs from "fs";
import path from "path";
import stream from "stream";
import cloudinary from "./cloudinaryClient.js";

// Promise timeout wrapper
export const withTimeout = (promise, timeoutMs, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeoutMs)
    ),
  ]);

// Upload a buffer directly to Cloudinary
// export const uploadBufferToCloudinary = (buffer, filename) =>
//   new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         resource_type: "auto",
//         public_id: `compressed_${path.parse(filename).name}_${Date.now()}`,
//         format: "pdf",
//       },
//       (error, result) => (error ? reject(error) : resolve(result))
//     );

//     const bufferStream = new stream.PassThrough();
//     bufferStream.end(buffer);
//     bufferStream.pipe(uploadStream);
//   });

  export const uploadBufferToCloudinary = async (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto", // auto-detects PDF/image
        public_id: `${path.parse(filename).name}_${Date.now()}`,
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );

    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

// Delete file from Cloudinary
export const deleteFromCloudinary = (publicId, resourceType = 'image') =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });

// Delete multiple files from Cloudinary
export const deleteMultipleFromCloudinary = (publicIds, resourceType = 'image') =>
  new Promise((resolve, reject) => {
    cloudinary.api.delete_resources(publicIds, { resource_type: resourceType }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });

// Delete file by URL (extracts public_id from URL)
export const deleteFromCloudinaryByUrl = (url, resourceType = 'image') => {
  try {
    // Extract public_id from Cloudinary URL
    const urlParts = url.split('/');
    const filenameWithExtension = urlParts[urlParts.length - 1];
    const publicId = filenameWithExtension.split('.')[0];

    return deleteFromCloudinary(publicId, resourceType);
  } catch (error) {
    return Promise.reject(new Error(`Invalid Cloudinary URL: ${error.message}`));
  }
};

// Clean temporary uploaded files
export const cleanupFile = (filePath) => {
  // Clean up uploaded local file
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log("Temp file cleaned up");
  }
};