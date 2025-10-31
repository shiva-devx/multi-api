import path from "path";
import fs from "fs";
import cloudinary from "../utils/cloudinaryClient.js";
import { cleanupFile } from "../utils/helper.js";
import axios from "axios";

// Compress and convert image → PDF
export const compressImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = path.resolve(req.file.path);
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();
  const allowed = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"];

  if (!allowed.includes(ext)) {
    cleanupFile(filePath);
    return res.status(400).json({ error: "Only image files are supported." });
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
      format: "pdf",
      quality: "auto:good",
      transformation: [{ flags: "attachment:document" }, { quality: "auto:good" }],
      public_id: `compressed_${path.parse(originalName).name}_${Date.now()}`,
    });

    res.json({
      success: true,
      message: "Image compressed and converted to PDF successfully",
      downloadUrl: result.secure_url,
      size: result.bytes,
      format: result.format,
    });
  } catch (err) {
    res.status(500).json({ error: "Compression failed", details: err.message });
  } finally {
    cleanupFile(filePath);
  }
};

// upscale image
export const enhanceImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "no image uploaded" })
  }

  const filePath = path.resolve(req.file.path);
  const originalName = req.file.originalname.replace(/\.[^.]+$/, "");
  try {

    // 1️⃣ Upload original image to Cloudinary server first
    const uploaded = await cloudinary.uploader.upload(filePath, {
      folder: "image-enhanced",
      resource_type: "image"
    })

    // 2️⃣ Apply Cloudinary AI Enhancements & Upscale
    const enhancedUrl = cloudinary.url(uploaded.public_id, {
      transformation: [
        { quality: "auto:best" },     // best quality Cloudinary allows
        { effect: "sharpen" },        // sharpen edges
        { effect: "auto_contrast" },
        { effect: "auto_color" },
        { crop: "limit", width: 2000, height: 2000 }, // upscale up to 2000px max
        { fetch_format: "jpg" }
      ]
    });

    // 3️⃣ Fetch enhanced image as binary buffer
    const response = await axios.get(enhancedUrl, {
      responseType: "arraybuffer"
    });
    const buffer = Buffer.from(response.data, "binary");


    // 3️⃣ Clean temp file
    fs.unlinkSync(filePath);

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${originalName}_enhanced.jpg"`);
    return res.send(buffer);
  } catch (error) {
    console.error("Enhance Error:", error);
    return res.status(500).json({ error: "Image enhancement failed" });
  } finally {
    fs.unlinkSync(filePath);

  }
}

// Upload a buffer directly to Cloudinary
export const uploadBufferToCloudinary = (buffer, filename) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        public_id: `compressed_${path.parse(filename).name}_${Date.now()}`,
        format: "pdf",
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );

    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });


// Fetch Cloudinary file info
export const getCloudinaryInfo = async (req, res) => {
  try {
    const { public_id } = req.params;
    const result = await cloudinary.api.resource(public_id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: "File not found", details: err.message });
  }
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

// Clean temporary uploaded files
