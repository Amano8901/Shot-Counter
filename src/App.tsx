import React, { useState, useRef } from 'react';
import { Camera as CameraIcon, Upload, Droplets, Info, AlertCircle, Loader2, RotateCcw, ThumbsUp, ThumbsDown, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera } from './components/Camera';
import { predictShots, PredictionResult } from './services/gemini';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isProvidingFeedback, setIsProvidingFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ isAccurate: true, actualShots: '', userComment: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (base64Image: string) => {
    setImage(base64Image);
    setIsCameraOpen(false);
    analyzeImage(base64Image);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const prediction = await predictShots(base64);
      if (!prediction.isBottleDetected) {
        setError(prediction.errorMessage || "No water bottle detected. Please make sure the bottle is clearly visible.");
      } else {
        setResult(prediction);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to analyze the image. Please try again with a clearer photo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setFeedbackSubmitted(false);
    setIsProvidingFeedback(false);
    setFeedbackData({ isAccurate: true, actualShots: '', userComment: '' });
  };

  const submitFeedback = async () => {
    if (!result) return;
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prediction: result,
          isAccurate: feedbackData.isAccurate,
          actualShots: feedbackData.isAccurate ? result.shotsLeft : parseFloat(feedbackData.actualShots),
          userComment: feedbackData.userComment
        })
      });
      if (response.ok) {
        setFeedbackSubmitted(true);
        setIsProvidingFeedback(false);
      }
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-zinc-900 font-sans selection:bg-emerald-100">
      <div className="max-w-md mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200 mb-6"
          >
            <Droplets size={32} />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold tracking-tight mb-2"
          >
            Shot Counter
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500"
          >
            AI-powered liquid estimation
          </motion.p>
        </header>

        <main>
          <AnimatePresence mode="wait">
            {!image ? (
              <motion.div
                key="upload-options"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <button
                  onClick={() => setIsCameraOpen(true)}
                  className="w-full flex items-center justify-between p-6 bg-white rounded-2xl shadow-sm border border-zinc-200 hover:border-emerald-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 rounded-xl group-hover:bg-emerald-50 transition-colors">
                      <CameraIcon className="text-zinc-600 group-hover:text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Capture Photo</p>
                      <p className="text-sm text-zinc-500">Take a picture of the bottle</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-between p-6 bg-white rounded-2xl shadow-sm border border-zinc-200 hover:border-emerald-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 rounded-xl group-hover:bg-emerald-50 transition-colors">
                      <Upload className="text-zinc-600 group-hover:text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Upload Image</p>
                      <p className="text-sm text-zinc-500">Choose from your gallery</p>
                    </div>
                  </div>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </motion.div>
            ) : (
              <motion.div
                key="analysis-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Image Preview */}
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-xl bg-zinc-200 border-4 border-white">
                  <img src={image} alt="Bottle" className="w-full h-full object-cover" />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                      <Loader2 className="w-12 h-12 animate-spin mb-4" />
                      <p className="font-medium">Analyzing bottle...</p>
                    </div>
                  )}
                </div>

                {/* Results */}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-sm uppercase tracking-wider font-semibold text-zinc-400 mb-1">Estimated Shots</p>
                          <h2 className="text-6xl font-bold text-emerald-600">
                            {result.shotsLeft.toFixed(1)}
                          </h2>
                        </div>
                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                          {Math.round(result.confidenceScore * 100)}% Confidence
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Volume</span>
                          <span className="font-mono font-medium">{result.currentVolumeMl}ml / {result.totalCapacityMl}ml</span>
                        </div>
                        <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(result.currentVolumeMl / result.totalCapacityMl) * 100}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex gap-4">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg h-fit">
                        <Info size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-600 leading-relaxed">
                          {result.explanation}
                        </p>
                      </div>
                    </div>

                    {/* Feedback Section */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                      {!feedbackSubmitted ? (
                        !isProvidingFeedback ? (
                          <div className="flex flex-col items-center gap-4">
                            <p className="text-sm font-medium text-zinc-500">Was this prediction accurate?</p>
                            <div className="flex gap-4">
                              <button 
                                onClick={() => {
                                  setFeedbackData({ ...feedbackData, isAccurate: true });
                                  setIsProvidingFeedback(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                <ThumbsUp size={18} />
                                Yes
                              </button>
                              <button 
                                onClick={() => {
                                  setFeedbackData({ ...feedbackData, isAccurate: false });
                                  setIsProvidingFeedback(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                              >
                                <ThumbsDown size={18} />
                                No
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">Improve Accuracy</h3>
                              <button onClick={() => setIsProvidingFeedback(false)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
                            </div>
                            
                            {!feedbackData.isAccurate && (
                              <div>
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Actual Shots Left</label>
                                <input 
                                  type="number" 
                                  step="0.1"
                                  value={feedbackData.actualShots}
                                  onChange={(e) => setFeedbackData({ ...feedbackData, actualShots: e.target.value })}
                                  placeholder="e.g. 4.5"
                                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Comments (Optional)</label>
                              <textarea 
                                value={feedbackData.userComment}
                                onChange={(e) => setFeedbackData({ ...feedbackData, userComment: e.target.value })}
                                placeholder="Tell us why it was wrong..."
                                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500 h-20 resize-none"
                              />
                            </div>

                            <button 
                              onClick={submitFeedback}
                              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                            >
                              <Send size={18} />
                              Submit Feedback
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-center gap-3 text-emerald-600 py-2">
                          <CheckCircle2 size={20} />
                          <span className="font-medium">Thanks for your feedback!</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {error && (
                  <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex gap-4 text-red-700">
                    <AlertCircle className="shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  onClick={reset}
                  className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
                >
                  <RotateCcw size={20} />
                  Try Another
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-12 text-center text-xs text-zinc-400">
          <p>1 shot = 25ml. Estimates are based on AI analysis and may vary.</p>
        </footer>
      </div>

      {isCameraOpen && (
        <Camera 
          onCapture={handleCapture} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}
    </div>
  );
}
