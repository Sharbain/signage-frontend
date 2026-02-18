import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Wifi, WifiOff, Info, X, Maximize2, Download, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import generatedImage from '@assets/generated_images/digital_signage_coffee_shop_menu_board_with_dark_theme.png';
import abstractImage from '@assets/generated_images/modern_abstract_geometric_waves_for_digital_signage_content.png';

export default function Player() {
  const [, params] = useRoute("/player/:id");
  const [isLoading, setIsLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(true);
  const [time, setTime] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [activeContent, setActiveContent] = useState(0);

  useEffect(() => {
    // Simulate initial content loading
    const timer = setTimeout(() => setIsLoading(false), 2500);
    
    // Clock update
    const clockInterval = setInterval(() => setTime(new Date()), 1000);
    
    // Content loop simulation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setActiveContent(c => (c === 0 ? 1 : 0));
          return 0;
        }
        return prev + 0.5;
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(clockInterval);
      clearInterval(progressInterval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white space-y-6 cursor-none">
        <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold tracking-wider">LUMINA PLAYER</h2>
          <p className="text-white/50 font-mono text-sm">Initializing device {params?.id || "DEV-001"}...</p>
        </div>
        <div className="w-64">
          <Progress value={66} className="h-1 bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden cursor-none group">
      {/* Content Layer */}
      <div className="absolute inset-0 animate-in fade-in duration-1000">
        <img 
          src={activeContent === 0 ? generatedImage : abstractImage} 
          alt="Content" 
          className="h-full w-full object-cover"
        />
      </div>

      {/* Debug Overlay (Shows on hover or active state) */}
      <div className={`absolute top-0 left-0 w-full p-6 transition-opacity duration-300 ${showDebug ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div className="flex items-start justify-between">
          <div className="bg-black/80 backdrop-blur-md rounded-lg p-4 border border-white/10 text-white/80 font-mono text-xs space-y-2 min-w-[200px]">
            <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-2">
              <span className="font-bold text-primary">DEBUG INFO</span>
              <button onClick={() => setShowDebug(false)} className="hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="flex justify-between">
              <span>ID:</span>
              <span className="text-white">{params?.id || "DEV-001"}</span>
            </div>
            <div className="flex justify-between">
              <span>IP:</span>
              <span className="text-white">192.168.1.42</span>
            </div>
            <div className="flex justify-between items-center">
              <span>STATUS:</span>
              <span className="flex items-center text-green-400 gap-1">
                <Wifi className="h-3 w-3" /> CONNECTED
              </span>
            </div>
            <div className="flex justify-between">
              <span>RES:</span>
              <span className="text-white">3840 x 2160 @ 60Hz</span>
            </div>
            <div className="flex justify-between">
              <span>UPTIME:</span>
              <span className="text-white">4d 12h 32m</span>
            </div>
            <div className="pt-2 mt-2 border-t border-white/10">
              <div className="flex justify-between mb-1">
                <span>CACHE:</span>
                <span className="text-white">1.2GB / 4GB</span>
              </div>
              <div className="flex justify-between items-center">
                <span>NEXT SYNC:</span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" /> 4m 12s
                </span>
              </div>
            </div>
          </div>

          <div className="bg-black/80 backdrop-blur-md rounded-lg px-4 py-2 border border-white/10 text-white flex items-center gap-3">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-xl">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar for Loop */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-linear" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
