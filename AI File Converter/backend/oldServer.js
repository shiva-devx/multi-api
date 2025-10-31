import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";
import { v2 as cloudinary } from "cloudinary";
import stream from "stream";

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

// Verify environment variables
console.log("Environment check:");
console.log("ILOVEPDF_PUBLIC_KEY exists:", !!process.env.ILOVEPDF_PUBLIC_KEY);
console.log("ILOVEPDF_SECRET_KEY exists:", !!process.env.ILOVEPDF_SECRET_KEY);
console.log("CLOUDINARY_CLOUD_NAME exists:", !!process.env.CLOUDINARY_CLOUD_NAME);
console.log("CLOUDINARY_API_KEY exists:", !!process.env.CLOUDINARY_API_KEY);
console.log("CLOUDINARY_API_SECRET exists:", !!process.env.CLOUDINARY_API_SECRET);

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup
const upload = multer({ 
    dest: "uploads/",
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed'), false);
        }
    }
});

// iLovePDF SDK instance
const ilovepdf = new ILovePDFApi(
    process.env.ILOVEPDF_PUBLIC_KEY,
    process.env.ILOVEPDF_SECRET_KEY
);

app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    next();
});

// Utility function with timeout
const withTimeout = (promise, timeoutMs, timeoutMessage) => {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
};

// Utility to convert image to PDF using Cloudinary
const convertImageToPDF = async (imagePath, originalName) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            imagePath,
            {
                resource_type: "image",
                format: "pdf",
                transformation: [
                    { flags: "attachment:document" }
                ],
                public_id: `pdf_${path.parse(originalName).name}_${Date.now()}`
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
    });
};

// Utility to download file from Cloudinary
const downloadFromCloudinary = async (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file: ${response.statusCode}`));
                return;
            }

            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
};

// Upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, filename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "auto",
                public_id: `compressed_${path.parse(filename).name}_${Date.now()}`,
                format: 'pdf'
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );

        // Create a readable stream from buffer and pipe to uploadStream
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);
        bufferStream.pipe(uploadStream);
    });
};

// Main compression endpoint - handles both PDF and images
app.post("/api/compress", upload.single("file"), async (req, res) => {
    console.log("API called");

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.resolve(req.file.path);
    const originalName = req.file.originalname;

    console.log("File uploaded:", originalName);
    console.log("File size:", req.file.size, "bytes");
    console.log("Temp path:", filePath);

    // Validate PDF
    if (path.extname(originalName).toLowerCase() !== ".pdf") {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: "Only PDF files are supported." });
    }

    // Check if file exists and has content
    if (!fs.existsSync(filePath)) {
        return res.status(400).json({ error: "Uploaded file not found" });
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: "Uploaded file is empty" });
    }

    try {
        // 1️⃣ Upload to Cloudinary
        console.log("Uploading file to Cloudinary...");
        const cloudRes = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
            folder: "pdfs",
        });
        const cloudinaryUrl = cloudRes.secure_url;
        console.log("Uploaded to Cloudinary:", cloudinaryUrl);

        // 2️⃣ Initialize iLovePDF task
        const task = ilovepdf.newTask("compress");
        await task.start();
        console.log("iLovePDF task started");

        // 3️⃣ Add file via Cloudinary URL
        await task.addFile(cloudinaryUrl);
        console.log("File added to iLovePDF task via URL");

        // 4️⃣ Process compression
        await task.process({ compression_level: "recommended" });
        console.log("Compression completed");

        // 5️⃣ Download result
        const data = await task.download();
        console.log("Downloaded compressed file, size:", data.length, "bytes");

        // 6️⃣ Send file to frontend
        const outputFileName = `compressed_${originalName}`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${outputFileName}"`);
        res.send(data);

        console.log("File sent to client");

    } catch (err) {
        console.error("❌ Error:", err.message || err);
        res.status(500).json({
            error: "PDF processing failed",
            details: err.message || err
        });
    } finally {
        // Clean up uploaded local file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Temp file cleaned up");
        }
    }
});

// Direct Cloudinary compression endpoint (images only)
app.post("/api/compress-image", upload.single("file"), async (req, res) => {
    console.log("=== CLOUDINARY IMAGE COMPRESSION ===");

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.resolve(req.file.path);
    const originalName = req.file.originalname;
    const fileExt = path.extname(originalName).toLowerCase();

    // Validate image
    const allowedImages = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
    if (!allowedImages.includes(fileExt)) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: "Only image files are supported for this endpoint." });
    }

    try {
        console.log("Uploading image to Cloudinary for compression...");
        
        // Upload with compression and PDF conversion
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "image",
            format: "pdf", // Convert to PDF
            quality: "auto:good", // Good compression
            transformation: [
                { flags: "attachment:document" },
                { quality: "auto:good" }
            ],
            public_id: `compressed_${path.parse(originalName).name}_${Date.now()}`
        });

        console.log("Cloudinary compression successful");

        res.json({
            success: true,
            message: "Image compressed and converted to PDF successfully",
            downloadUrl: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            size: result.bytes,
            pages: result.pages
        });

    } catch (err) {
        console.error("Cloudinary compression error:", err.message);
        res.status(500).json({
            error: "Image compression failed",
            details: err.message
        });
    } finally {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});

// Health check with service status
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        services: {
            iLovePDF: !!process.env.ILOVEPDF_PUBLIC_KEY,
            Cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME
        },
        maxFileSize: "10MB",
        endpoints: {
            compress: "/api/compress (PDFs and images)",
            compressImage: "/api/compress-image (images only, Cloudinary only)",
            health: "/api/health"
        }
    });
});

// Get Cloudinary file info
app.get("/api/cloudinary-info/:public_id", async (req, res) => {
    try {
        const { public_id } = req.params;
        const result = await cloudinary.api.resource(public_id);
        res.json(result);
    } catch (err) {
        res.status(404).json({ error: "File not found", details: err.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Backend running on http://localhost:${port}`);
    console.log(`📝 Health check: http://localhost:${port}/api/health`);
    console.log(`🖼️  Image compression: http://localhost:${port}/api/compress-image`);
    console.log(`📄 Universal compression: http://localhost:${port}/api/compress`);
});