import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, List, Map as MapIcon, Locate, Bell, X, Sparkles, Navigation, Trash2, ExternalLink } from 'lucide-react';
import Map from './components/Map';
import { Coordinates, Memo, COLORS, ViewMode } from './types';
import { calculateDistance, getCurrentPosition } from './utils/geoUtils';
import { getGeminiSuggestion } from './services/geminiService';

function App() {
  // State
  const [memos, setMemos] = useState<Memo[]>(() => {
    const saved = localStorage.getItem('geo_memos');
    return saved ? JSON.parse(saved) : [];
  });
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>({ lat: 25.0330, lng: 121.5654 }); // Default to Taipei 101
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.MAP);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [activeMemo, setActiveMemo] = useState<Memo | null>(null);
  const [notification, setNotification] = useState<Memo | null>(null);
  
  // Form State
  const [newMemoTitle, setNewMemoTitle] = useState('');
  const [newMemoContent, setNewMemoContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiUrls, setAiUrls] = useState<Array<{ uri: string; title: string }>>([]);

  // Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('geo_memos', JSON.stringify(memos));
  }, [memos]);

  // Geolocation Tracking & Trigger Logic
  useEffect(() => {
    getCurrentPosition()
      .then(coords => {
        setUserLocation(coords);
        setMapCenter(coords);
      })
      .catch(err => console.error("Initial location error", err));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(newCoords);
        checkProximity(newCoords);
      },
      (error) => console.error("Watch position error", error),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to set up watcher

  // Proximity Check Function
  const checkProximity = (currentLoc: Coordinates) => {
    setMemos(prevMemos => {
      const updatedMemos = prevMemos.map(memo => {
        const distance = calculateDistance(currentLoc, memo.location);
        
        // Trigger logic: Inside radius AND not recently triggered
        if (distance <= memo.radius && !memo.isTriggered) {
          triggerNotification(memo);
          return { ...memo, isTriggered: true };
        }
        
        // Reset trigger logic: Outside radius + buffer (e.g. 50m extra)
        if (distance > memo.radius + 50 && memo.isTriggered) {
          return { ...memo, isTriggered: false };
        }
        
        return memo;
      });
      return updatedMemos;
    });
  };

  const triggerNotification = (memo: Memo) => {
    setNotification(memo);
    // Play sound if available
    // const audio = new Audio('/notification.mp3'); 
    // audio.play().catch(e => console.log('Audio play failed', e));
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };

  const handleMapClick = (coords: Coordinates) => {
    setSelectedLocation(coords);
    setIsModalOpen(true);
    setNewMemoTitle('');
    setNewMemoContent('');
    setAiUrls([]);
  };

  const handleAddMemo = () => {
    if (!selectedLocation || !newMemoTitle) return;

    const newMemo: Memo = {
      id: uuidv4(),
      title: newMemoTitle,
      content: newMemoContent,
      location: selectedLocation,
      radius: 100, // Default 100m
      isTriggered: false,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      createdAt: Date.now(),
      groundingUrls: aiUrls
    };

    setMemos(prev => [...prev, newMemo]);
    setIsModalOpen(false);
    setSelectedLocation(null);
  };

  const handleDeleteMemo = (id: string) => {
    setMemos(prev => prev.filter(m => m.id !== id));
    if (activeMemo?.id === id) setActiveMemo(null);
  };

  const handleAISuggestion = async () => {
    if (!selectedLocation) return;
    
    setIsGenerating(true);
    try {
      const result = await getGeminiSuggestion(selectedLocation, newMemoTitle || undefined);
      setNewMemoContent(result.text);
      setAiUrls(result.groundingUrls);
      if (!newMemoTitle) {
        setNewMemoTitle("新地點備忘錄");
      }
    } catch (error) {
      console.error(error);
      setNewMemoContent("無法取得 AI 建議");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCenterUser = () => {
    if (userLocation) {
      setMapCenter({ ...userLocation });
    } else {
      getCurrentPosition().then(coords => {
        setUserLocation(coords);
        setMapCenter(coords);
      });
    }
  };

  // Render Helpers
  const renderSidebar = () => (
    <div className={`
      fixed inset-y-0 left-0 bg-white shadow-xl z-[1000] w-full md:w-96 transition-transform duration-300 transform
      ${viewMode === ViewMode.LIST ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:static md:w-96 md:border-r'}
    `}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            GeoMemo
          </h1>
          <button 
            onClick={() => setViewMode(ViewMode.MAP)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {memos.length === 0 ? (
            <div className="text-center text-slate-400 mt-10">
              <MapIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>點擊地圖任意處<br/>新增您的第一個備忘錄</p>
            </div>
          ) : (
            memos.map(memo => (
              <div 
                key={memo.id}
                onClick={() => {
                  setMapCenter(memo.location);
                  setActiveMemo(memo);
                  setViewMode(ViewMode.MAP);
                }}
                className={`
                  p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group
                  ${activeMemo?.id === memo.id ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: memo.color }}></div>
                    <h3 className="font-semibold text-slate-800">{memo.title}</h3>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMemo(memo.id);
                    }}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{memo.content}</p>
                {memo.location && (
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <MapIcon className="w-3 h-3" />
                    {userLocation ? `${Math.round(calculateDistance(userLocation, memo.location))}m 遠` : 'Unknown distance'}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-100 relative font-sans text-slate-900">
      
      {/* Sidebar / List View */}
      {renderSidebar()}

      {/* Main Map Area */}
      <div className="flex-1 relative h-full">
        {/* Mobile Header */}
        <div className="absolute top-4 left-4 z-[500] md:hidden">
          <button 
            onClick={() => setViewMode(ViewMode.LIST)}
            className="bg-white p-3 rounded-full shadow-lg text-slate-700 active:scale-95 transition-transform"
          >
            <List className="w-6 h-6" />
          </button>
        </div>

        {/* Locate Me Button */}
        <button 
          onClick={handleCenterUser}
          className="absolute bottom-8 right-4 z-[500] bg-white p-3 rounded-full shadow-lg text-blue-600 hover:bg-blue-50 active:scale-95 transition-transform"
          title="定位到我的位置"
        >
          <Locate className="w-6 h-6" />
        </button>

        <Map 
          center={mapCenter} 
          memos={memos} 
          onMapClick={handleMapClick}
          onMemoClick={(memo) => {
            setActiveMemo(memo);
            // Don't change view mode, just show details
          }}
          userLocation={userLocation}
        />
      </div>

      {/* Add Memo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">新增備忘錄</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">標題</label>
                  <input
                    type="text"
                    value={newMemoTitle}
                    onChange={(e) => setNewMemoTitle(e.target.value)}
                    placeholder="例如：超市買牛奶、抵達公司"
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    內容 
                    <button 
                        onClick={handleAISuggestion}
                        disabled={isGenerating}
                        className="ml-2 text-xs bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-2 py-0.5 rounded-full inline-flex items-center gap-1 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        <Sparkles className="w-3 h-3" />
                        {isGenerating ? 'Gemini 思考中...' : 'AI 建議'}
                    </button>
                  </label>
                  <textarea
                    value={newMemoContent}
                    onChange={(e) => setNewMemoContent(e.target.value)}
                    placeholder="備忘錄詳細內容..."
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-32 resize-none transition-all"
                  />
                  {aiUrls.length > 0 && (
                    <div className="mt-2 text-xs">
                        <p className="text-slate-500 mb-1">參考來源：</p>
                        <div className="flex flex-wrap gap-2">
                        {aiUrls.map((link, idx) => (
                            <a 
                                key={idx} 
                                href={link.uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                            >
                                <ExternalLink className="w-3 h-3" />
                                {link.title}
                            </a>
                        ))}
                        </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddMemo}
                    disabled={!newMemoTitle}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all"
                  >
                    儲存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arrival Notification Popup */}
      {notification && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-white rounded-2xl shadow-2xl z-[3000] p-6 border-l-8 border-green-500 animate-bounce-in">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-full">
                <Bell className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">已抵達：{notification.title}</h3>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-600 mt-2">{notification.content}</p>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setNotification(null)}
              className="text-sm text-blue-600 font-medium hover:underline"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* Active Memo Details (when clicking marker) */}
      {activeMemo && !notification && (
         <div className="fixed bottom-0 inset-x-0 md:bottom-8 md:right-4 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[1500] p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: activeMemo.color }}></div>
                    <h2 className="text-lg font-bold text-slate-800">{activeMemo.title}</h2>
                </div>
                <button onClick={() => setActiveMemo(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <p className="text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">{activeMemo.content}</p>
            
            {activeMemo.groundingUrls && activeMemo.groundingUrls.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">相關資訊</p>
                    <div className="flex flex-col gap-2">
                         {activeMemo.groundingUrls.map((link, idx) => (
                            <a 
                                key={idx} 
                                href={link.uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:underline bg-slate-50 p-2 rounded hover:bg-blue-50 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                {link.title}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center text-sm text-slate-500 border-t pt-4">
                <span>半徑範圍: {activeMemo.radius}m</span>
                <button 
                    onClick={() => handleDeleteMemo(activeMemo.id)}
                    className="text-red-500 flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                    <Trash2 className="w-4 h-4" /> 刪除
                </button>
            </div>
         </div>
      )}
    </div>
  );
}

export default App;