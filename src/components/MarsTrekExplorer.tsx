import React, { useEffect, useRef, useState } from 'react';
import {
  MARS_TREK_LANDMARKS,
  MARS_TREK_LAYERS,
  MarsRoverPhoto,
  MissionSiteId,
  NasaApodSpotlight,
  OutpostGallerySlide,
  fetchOutpostImageGallery,
  getMarsTrekTileUrl,
  latLonToMarsTrekTile,
} from '../game/nasaData';

interface MarsTrekExplorerProps {
  siteId?: MissionSiteId;
  marsPhotos: { status: 'live' | 'archive'; rover: string; photos: MarsRoverPhoto[] };
  apod: NasaApodSpotlight | null;
}

export const MarsTrekExplorer: React.FC<MarsTrekExplorerProps> = ({
  siteId = 'mars',
  marsPhotos,
  apod,
}) => {
  const [galleryStatus, setGalleryStatus] = useState<'live' | 'archive' | 'loading'>('loading');
  const [gallerySlides, setGallerySlides] = useState<OutpostGallerySlide[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [galleryZoomed, setGalleryZoomed] = useState<boolean>(false);
  const swipeStartXRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    setGalleryStatus('loading');
    fetchOutpostImageGallery(siteId).then((res) => {
      if (!mounted) return;
      setGalleryStatus(res.status);
      setGallerySlides(res.slides);
      setActiveSlideIdx(0);
    });
    return () => {
      mounted = false;
    };
  }, [siteId]);

  const goPrevSlide = () => {
    if (gallerySlides.length === 0) return;
    setActiveSlideIdx((i) => (i - 1 + gallerySlides.length) % gallerySlides.length);
  };
  const goNextSlide = () => {
    if (gallerySlides.length === 0) return;
    setActiveSlideIdx((i) => (i + 1) % gallerySlides.length);
  };

  const activeSlide = gallerySlides[activeSlideIdx] || null;

  const [layerId, setLayerId] = useState<'viking' | 'mola'>('viking');
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string>('jezero');
  const [zoom, setZoom] = useState<number>(2);
  const [panColOffset, setPanColOffset] = useState<number>(0);
  const [panRowOffset, setPanRowOffset] = useState<number>(0);
  const [failedTiles, setFailedTiles] = useState<Record<string, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const layer = MARS_TREK_LAYERS.find((l) => l.id === layerId) || MARS_TREK_LAYERS[0];
  const landmark =
    MARS_TREK_LANDMARKS.find((l) => l.id === selectedLandmarkId) || MARS_TREK_LANDMARKS[0];

  const baseTile = latLonToMarsTrekTile(landmark.lat, landmark.lon, zoom);
  const centerCol =
    ((baseTile.col + panColOffset) % baseTile.maxCols + baseTile.maxCols) % baseTile.maxCols;
  const centerRow = Math.max(0, Math.min(baseTile.maxRows - 1, baseTile.row + panRowOffset));

  // Build a 3x2 tile window centered on (centerCol, centerRow)
  const colOffsets = [-1, 0, 1];
  const rowOffsets = centerRow === 0 ? [0, 1] : centerRow >= baseTile.maxRows - 1 ? [-1, 0] : [-1, 0];

  const selectLandmark = (id: string) => {
    setSelectedLandmarkId(id);
    setPanColOffset(0);
    setPanRowOffset(0);
    setFailedTiles({});
  };

  return (
    <div className="space-y-5">
      {/* Outpost Image Gallery — Swipeable High-Res NASA Mars/Moon Trek Site Imagery */}
      <div
        data-testid="outpost-image-gallery"
        className="p-4 rounded-xl bg-slate-900 border-2 border-cyan-500/50 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              OUTPOST IMAGE GALLERY · {siteId === 'mars' ? 'JEZERO CRATER DELTA (MARS)' : 'SHACKLETON CRATER RIM (MOON)'}
            </div>
            <h3 className="text-base font-bold text-white">
              🛰️ Swipe High-Resolution NASA {siteId === 'mars' ? 'Mars' : 'Moon'} Trek Landing Zone Imagery
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-emerald-300">
              {galleryStatus === 'live'
                ? '● LIVE NASA TREK API'
                : galleryStatus === 'loading'
                ? 'FETCHING TREK API...'
                : 'VERIFIED TREK ARCHIVE'}
            </span>
            {activeSlide && (
              <span className="text-xs font-mono text-slate-300 tabular-nums">
                {activeSlideIdx + 1} / {gallerySlides.length}
              </span>
            )}
          </div>
        </div>

        {activeSlide ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Swipeable Stage */}
            <div
              className="lg:col-span-7 relative rounded-xl overflow-hidden border border-slate-700 bg-[#050811] select-none cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => {
                swipeStartXRef.current = e.clientX;
              }}
              onPointerUp={(e) => {
                if (swipeStartXRef.current === null) return;
                const dx = e.clientX - swipeStartXRef.current;
                swipeStartXRef.current = null;
                if (dx <= -36) goNextSlide();
                else if (dx >= 36) goPrevSlide();
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') goPrevSlide();
                if (e.key === 'ArrowRight') goNextSlide();
              }}
              tabIndex={0}
              aria-label="Swipe or use arrow keys to browse Outpost landing zone photos"
            >
              <div className="h-56 sm:h-full sm:min-h-[16rem] w-full bg-[#1C0A05] overflow-hidden relative">
                {!failedImages[activeSlide.id] && activeSlide.imageUrl ? (
                  <img
                    src={activeSlide.imageUrl}
                    alt={activeSlide.title}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      galleryZoomed ? 'scale-150' : 'scale-100'
                    }`}
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [activeSlide.id]: true }))
                    }
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#2B1208] to-[#090E1A]">
                    <div className="text-xs font-mono text-orange-300">{activeSlide.coordinates}</div>
                    <div className="text-sm font-bold text-white mt-1">{activeSlide.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{activeSlide.instrument}</div>
                  </div>
                )}

                {/* Prev / Next Overlay Controls */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrevSlide();
                  }}
                  aria-label="Previous outpost site photo"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 px-3 py-2 rounded-xl bg-slate-950/85 hover:bg-slate-800 border border-slate-600 text-white font-bold text-sm cursor-pointer"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNextSlide();
                  }}
                  aria-label="Next outpost site photo"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-3 py-2 rounded-xl bg-slate-950/85 hover:bg-slate-800 border border-slate-600 text-white font-bold text-sm cursor-pointer"
                >
                  →
                </button>

                {/* Bottom overlay hint + zoom button */}
                <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-2 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950/85 border border-slate-700 text-[10px] font-mono text-cyan-300">
                    ← SWIPE OR CLICK ARROWS →
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryZoomed((z) => !z);
                    }}
                    className="pointer-events-auto px-2.5 py-1 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-600 text-[10px] font-mono text-white cursor-pointer"
                  >
                    {galleryZoomed ? '🔍 1.0x Reset' : '🔍 1.5x Inspect'}
                  </button>
                </div>
              </div>
            </div>

            {/* Metadata + Slide Strip */}
            <div className="lg:col-span-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-amber-300">{activeSlide.sourceTag}</div>
                <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
                  {activeSlide.title}
                </h4>
                <div className="text-xs font-mono text-cyan-300">{activeSlide.zoneLabel}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">COORDINATES</div>
                    <div className="text-white font-bold">{activeSlide.coordinates}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">ELEVATION</div>
                    <div className="text-amber-300 font-bold">{activeSlide.elevationLabel}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{activeSlide.description}</p>
                <div className="text-[11px] font-mono text-slate-400">
                  Instrument: {activeSlide.instrument}
                </div>
              </div>

              {/* Dots + Prev/Next Text Controls */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={goPrevSlide}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                >
                  ← Prev Site
                </button>
                <div className="flex items-center gap-1.5">
                  {gallerySlides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-label={`View gallery slide ${idx + 1}: ${s.title}`}
                      onClick={() => setActiveSlideIdx(idx)}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        idx === activeSlideIdx ? 'w-6 bg-cyan-400' : 'w-2.5 bg-slate-700 hover:bg-slate-500'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={goNextSlide}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-slate-950 cursor-pointer"
                >
                  Next Site →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs font-mono text-slate-400">
            Loading NASA Trek landing zone gallery...
          </div>
        )}
      </div>

      {/* Interactive NASA Mars Trek Map */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-mono text-orange-400">
              NASA MARS TREK WMTS IMAGERY · INTERACTIVE SURFACE EXPLORER
            </div>
            <h3 className="text-base font-bold text-white">
              {landmark.name} ({landmark.lat.toFixed(2)}° N, {landmark.lon.toFixed(2)}° E)
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {MARS_TREK_LAYERS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setLayerId(l.id as 'viking' | 'mola');
                  setFailedTiles({});
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  layerId === l.id
                    ? 'bg-orange-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {l.id === 'viking' ? '🛰️ Viking Color' : '⛰️ MOLA Elevation'}
              </button>
            ))}
          </div>
        </div>

        {/* Landmark Quick Jump Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">LANDMARKS:</span>
          {MARS_TREK_LANDMARKS.map((lm) => (
            <button
              key={lm.id}
              type="button"
              onClick={() => selectLandmark(lm.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedLandmarkId === lm.id
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-950 border border-slate-700 text-slate-300 hover:border-cyan-400'
              }`}
            >
              📍 {lm.name.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Tile Viewport + Pan/Zoom Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 relative rounded-xl overflow-hidden border-2 border-orange-500/40 bg-[#1C0A05]">
            <div className="grid grid-cols-3 w-full">
              {rowOffsets.map((rOff) =>
                colOffsets.map((cOff) => {
                  const tileRow = Math.max(0, Math.min(baseTile.maxRows - 1, centerRow + rOff));
                  const tileCol =
                    ((centerCol + cOff) % baseTile.maxCols + baseTile.maxCols) % baseTile.maxCols;
                  const tileUrl = getMarsTrekTileUrl(layer.layerPath, zoom, tileRow, tileCol);
                  const tileKey = `${layer.id}-${zoom}-${tileRow}-${tileCol}`;
                  const isCenterTile = rOff === 0 && cOff === 0 && panColOffset === 0 && panRowOffset === 0;

                  return (
                    <div key={tileKey} className="relative aspect-square bg-[#2B1208] overflow-hidden">
                      {!failedTiles[tileKey] ? (
                        <img
                          src={tileUrl}
                          alt={`NASA Mars Trek ${layer.label} tile z${zoom} r${tileRow} c${tileCol}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover block"
                          onError={() => setFailedTiles((prev) => ({ ...prev, [tileKey]: true }))}
                        />
                      ) : (
                        <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
                          <rect
                            width="100"
                            height="100"
                            fill={layerId === 'mola' ? '#1E1B4B' : '#431407'}
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="30"
                            fill="none"
                            stroke={layerId === 'mola' ? '#38BDF8' : '#C2410C'}
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                          <text
                            x="50"
                            y="54"
                            textAnchor="middle"
                            fill="#FDBA74"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            Z{zoom} ({tileCol},{tileRow})
                          </text>
                        </svg>
                      )}
                      {isCenterTile && (
                        <div
                          className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                          style={{
                            left: `${Math.round(baseTile.fracX * 100)}%`,
                            top: `${Math.round(baseTile.fracY * 100)}%`,
                          }}
                        >
                          <span className="block w-5 h-5 rounded-full bg-cyan-400/35 border-2 border-cyan-300 shadow-lg" />
                          <span className="block w-2 h-2 rounded-full bg-white absolute top-1.5 left-1.5" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Overlay Pan & Zoom Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#070B14]/95 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPanRowOffset((v) => v - 1)}
                  aria-label="Pan Mars map North"
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono cursor-pointer"
                >
                  ↑ N
                </button>
                <button
                  type="button"
                  onClick={() => setPanRowOffset((v) => v + 1)}
                  aria-label="Pan Mars map South"
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono cursor-pointer"
                >
                  ↓ S
                </button>
                <button
                  type="button"
                  onClick={() => setPanColOffset((v) => v - 1)}
                  aria-label="Pan Mars map West"
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono cursor-pointer"
                >
                  ← W
                </button>
                <button
                  type="button"
                  onClick={() => setPanColOffset((v) => v + 1)}
                  aria-label="Pan Mars map East"
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono cursor-pointer"
                >
                  → E
                </button>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, z - 1))}
                  disabled={zoom <= 1}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white cursor-pointer"
                >
                  − Zoom Out
                </button>
                <span className="text-cyan-300 px-1">Z{zoom}</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(4, z + 1))}
                  disabled={zoom >= 4}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white cursor-pointer"
                >
                  + Zoom In
                </button>
              </div>
            </div>
          </div>

          {/* Landmark Environmental Readout */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="text-xs font-mono text-cyan-400">{landmark.missionTag}</div>
            <div className="text-sm font-bold text-white">{landmark.name}</div>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">ELEVATION</div>
                <div className="text-amber-300 font-bold tabular-nums">
                  {landmark.elevationMeters > 0 ? '+' : ''}
                  {landmark.elevationMeters.toLocaleString()} m
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">SURFACE TEMP</div>
                <div className="text-sky-300 font-bold">{landmark.tempRange}</div>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{landmark.kidFact}</p>
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
              <strong className="text-orange-300">Active Map Layer:</strong> {layer.instrument} —{' '}
              {layer.description}
            </div>
          </div>
        </div>
      </div>

      {/* Live Mars Rover Photos + NASA APOD Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Perseverance Live Raw Photos */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-bold text-white">
              🚗 {marsPhotos.rover} Surface Photos
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              {marsPhotos.status === 'live' ? 'LIVE JPL FEED' : 'VERIFIED JPL ARCHIVE'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {marsPhotos.photos.slice(0, 4).map((photo) => (
              <div
                key={photo.id}
                className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col"
              >
                <div className="h-28 bg-slate-900 overflow-hidden">
                  {!failedImages[photo.id] && photo.imgSrc ? (
                    <img
                      src={photo.imgSrc}
                      alt={photo.title}
                      className="w-full h-full object-cover"
                      onError={() => setFailedImages((p) => ({ ...p, [photo.id]: true }))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-mono text-orange-300 bg-[#2B1208]">
                      Sol {photo.sol} · {photo.cameraName}
                    </div>
                  )}
                </div>
                <div className="p-2 text-[11px]">
                  <div className="font-mono font-bold text-amber-300 truncate">
                    Sol {photo.sol} · {photo.cameraName}
                  </div>
                  <div className="text-slate-300 line-clamp-2 mt-0.5">{photo.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NASA Astronomy Picture of the Day / Spotlight */}
        {apod && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-bold text-white">
                🔭 NASA Astronomy Spotlight (APOD)
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                {apod.status === 'live' ? `LIVE · ${apod.date}` : `NASA JPL · ${apod.date}`}
              </span>
            </div>
            <div className="h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              {!failedImages['apod'] && apod.imageUrl ? (
                <img
                  src={apod.imageUrl}
                  alt={apod.title}
                  className="w-full h-full object-cover"
                  onError={() => setFailedImages((p) => ({ ...p, apod: true }))}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-cyan-300 font-mono">
                  {apod.title}
                </div>
              )}
            </div>
            <div className="text-xs font-bold text-cyan-300">{apod.title}</div>
            <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
              {apod.explanation}
            </p>
            <div className="text-[10px] font-mono text-slate-400 mt-auto">
              Credit: {apod.copyright}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
