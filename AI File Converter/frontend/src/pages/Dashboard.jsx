import React, { useState } from 'react';
import UploadModal from '../components/UploadModal';
import { useNavigate } from "react-router-dom"; 

const features = [
    { id: 1, name: 'Merge PDF', type: 'merge' },
    { id: 2, name: 'JPG to PDF', type: 'imagepdf' },
    { id: 3, name: 'Compress PDF', type: 'compress' },
    { id: 4, name: 'Upscale Image', type: 'upscale' },
];

const Dashboard = () => {
    const [activeFeature, setActiveFeature] = useState(null);
     const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6 text-center">AI File Converter</h1>


            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {features.map((f) => (

                    <button
                        key={f.id}
                        onClick={() => setActiveFeature(f)}
                        className="bg-white p-4 shadow-md rounded-xl hover:bg-indigo-100 text-center"
                    >
                        {f.name}
                    </button>
                ))}
                <button onClick={() => navigate("/generate-image")} className="bg-white p-4 shadow-md rounded-xl hover:bg-indigo-100 text-center">
                    Generate AI Image
                </button>


            </div>


            {activeFeature && (
                <UploadModal
                    feature={activeFeature}
                    onClose={() => setActiveFeature(null)}
                />
            )}
        </div>
    );
};


export default Dashboard;