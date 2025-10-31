import express from "express";
import { uploadSingle, uploadMultiple } from "../middleware/uploadMiddleware.js";
import { compressPDF, mergePDF, imageToPDF } from "../controllers/ilovepdfController.js";


const router = express.Router();

router.post("/compress", uploadSingle, compressPDF);
router.post('/merge', uploadMultiple, mergePDF);
router.post("/image-to-pdf", uploadMultiple, imageToPDF);
export default router;
