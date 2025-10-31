import React, { useState } from 'react';

const UploadModal = ({ feature, onClose }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (files.length === 0) return alert("Please select at least one file!");

        // Feature Configurations
        const featureMap = {
            merge: {
                endpoint: "api/merge",
                allowMultiple: true,
                allowedFormats: ["pdf"],
            },
            compress: {
                endpoint: "api/compress",
                allowMultiple: false,
                allowedFormats: ["pdf"],
            },
            imagepdf: {
                endpoint: "api/image-to-pdf",
                allowMultiple: true,
                allowedFormats: ["jpg", "jpeg", "png", "webp"],
            },
            upscale: {
                endpoint: "api/upscale",
                allowMultiple: false,
                allowedFormats: ["jpg", "jpeg", "png", "webp"],
            }
        };

        const config = featureMap[feature.type];
        if (!config) return alert("Unknown feature!");

        // Validate formats
        for (const file of files) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!config.allowedFormats.includes(ext)) {
                return alert(`Invalid file: ${file.name}. Allowed formats: ${config.allowedFormats.join(", ")}`);
            }
        }

        setLoading(true);
        const formData = new FormData();

        if (config.allowMultiple) {
            files.forEach((file) => formData.append("files", file));
        } else {
            formData.append("file", files[0]);
        }

        try {
            const res = await fetch(`http://localhost:4000/${config.endpoint}`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Processing failed");
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");

            let downloadName =
                feature.type === "merge"
                    ? "merged.pdf"
                    : feature.type === "compress"
                    ? `compressed_${files[0].name}`
                    : feature.type === "imagepdf"
                    ? "converted.pdf"
                    : `${files[0].name.split(".")[0]}_upscaled.jpg`;

            a.href = url;
            a.download = downloadName;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            onClose();
        } catch (error) {
            console.error(error);
            alert("Upload failed");
        } finally {
            setLoading(false);
        }
    };

    // Dynamic Label Text
    const labelText = {
        merge: "Select PDF files to merge:",
        compress: "Select a PDF to compress:",
        imagepdf: "Select image files to convert to PDF:",
        upscale: "Select an image to upscale:"
    }[feature.type];

    // Accept Types
    const acceptTypes =
        feature.type === "merge" || feature.type === "compress" ? ".pdf" : "image/*";

    // Button Text
    const buttonText = {
        merge: "Merge PDF",
        compress: "Compress PDF",
        imagepdf: "Convert to PDF",
        upscale: "Upscale Image"
    }[feature.type];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
                <h2 className="text-2xl font-semibold mb-4 text-center">{feature.name}</h2>

                <form onSubmit={handleUpload} className="space-y-4">
                    <label className="block text-sm font-medium mb-2">{labelText}</label>

                    <input
                        type="file"
                        accept={acceptTypes}
                        multiple={feature.type === "merge" || feature.type === "imagepdf"}
                        onChange={(e) => setFiles(Array.from(e.target.files))}
                        className="w-full border p-2 rounded"
                    />

                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:bg-indigo-400"
                        >
                            {loading ? "Processing..." : buttonText}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadModal;
