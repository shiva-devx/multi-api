import React, { useState } from "react";

const GenerateImage = () => {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return alert("Enter a prompt!");

    setLoading(true);
    setImage(null);

    try {
      const res = await fetch("http://localhost:4000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();

      if (!data.photo) {
        return alert("Image generation failed.");
      }

      // Convert Base64 to image preview
      setImage(data.photo);

    } catch (err) {
      console.error(err);
      alert("Error generating image.");
    }

    setLoading(false);
  };

  const downloadImage = () => {
    if (!image) return;

    const link = document.createElement("a");
    link.href = image;
    link.download = `generated_image_${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">

      <h1 className="text-3xl font-bold mb-6 neon-text">AI Image Generator</h1>

      <input
        type="text"
        placeholder="Describe your image..."
        className="w-full max-w-xl p-3 rounded-lg text-black outline-none mb-4"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        onClick={generate}
        disabled={loading}
        className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-800 transition-all shadow-[0_0_15px_#7f00ff] disabled:bg-purple-400"
      >
        {loading ? "Generating..." : "Generate Image"}
      </button>

      {image && (
        <>
          <img
            src={image}
            alt="Generated"
            className="mt-6 max-w-xl rounded-lg shadow-lg border border-purple-500"
          />

          <button
            onClick={downloadImage}
            className="mt-4 px-6 py-3 bg-green-500 hover:bg-green-700 rounded-lg shadow-[0_0_15px_#00ff9d]"
          >
            Download Image
          </button>
        </>
      )}

    </div>
  );
};

export default GenerateImage;
