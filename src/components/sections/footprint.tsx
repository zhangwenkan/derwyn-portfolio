"use client";

import dynamic from "next/dynamic";
import React, { FC, useMemo, useState } from "react";
import {
  defaultFootprintLocation,
  footprintLocations,
  footprintStories,
} from "@/components/footprint/footprint.data";

const FootprintGlobe = dynamic(
  () => import("@/components/footprint/FootprintGlobe"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[720px] w-full items-center justify-center bg-[#111722] text-white/70">
        Loading globe...
      </div>
    ),
  }
);

const Footprint: FC = () => {
  const [selectedLocationId, setSelectedLocationId] = useState(
    defaultFootprintLocation.id
  );
  const [isCardVisible, setIsCardVisible] = useState(true);

  const selectedLocation = useMemo(
    () =>
      footprintLocations.find((item) => item.id === selectedLocationId) ??
      defaultFootprintLocation,
    [selectedLocationId]
  );

  const selectedStory = useMemo(
    () => footprintStories[selectedLocation.id],
    [selectedLocation.id]
  );

  const handleSelect = (locationId: (typeof footprintLocations)[number]["id"]) => {
    setSelectedLocationId(locationId);
    setIsCardVisible(true);
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(124,182,255,0.22),_transparent_32%),linear-gradient(180deg,_#10151d_0%,_#181f29_38%,_#111722_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,209,102,0.16),transparent_16%),radial-gradient(circle_at_82%_24%,rgba(125,211,252,0.16),transparent_18%),radial-gradient(circle_at_50%_100%,rgba(196,181,253,0.18),transparent_28%)]" />

      <div className="absolute inset-0">
        <FootprintGlobe
          selectedLocationId={selectedLocation.id}
          onSelect={handleSelect}
        />
      </div>

      <div className="pointer-events-none relative z-10 flex min-h-dvh flex-col px-[5%] py-8 sm:py-10 lg:px-[4.5%]">
        <div className="max-w-[760px]">
          <p className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-1 text-[12px] uppercase tracking-[0.3em] text-white/70 sm:text-[14px]">
            Animated Travel Footprint
          </p>
          <h2 className="mt-4 text-[34px] font-black leading-tight sm:text-[50px] md:text-[60px] lg:text-[72px]">
            Places that shaped my perspective.
          </h2>
          <p className="mt-4 max-w-[720px] text-[15px] leading-8 text-white/65 sm:text-[17px]">
            Click a country on the globe to open a floating travel card with
            region-based snapshots and photo-wall placeholders.
          </p>
        </div>

        <div className="pointer-events-none relative mt-auto flex min-h-[62vh] items-end justify-end pb-4 sm:pb-8">
          {isCardVisible ? (
            <div className="footprint-float-card pointer-events-auto w-full max-w-[440px] rounded-[34px] p-4 text-white sm:p-5 lg:mr-4 lg:max-w-[500px] lg:p-6">
              <div className="relative mb-4 flex items-start justify-between gap-4 border-b border-white/8 pb-4">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full shadow-[0_0_20px_currentColor]"
                      style={{
                        backgroundColor: selectedLocation.accent,
                        color: selectedLocation.accent,
                      }}
                    />
                    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/48">
                      Photo wall
                    </span>
                  </div>
                  <h3 className="text-[30px] font-black leading-tight sm:text-[38px]">
                    {selectedLocation.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCardVisible(false)}
                  className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/62 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/44">
                  {selectedStory.regions.length} regions · {selectedStory.regions.reduce(
                    (total, region) => total + region.photos.length,
                    0
                  )} frames
                </p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/34">
                  curated placeholders
                </p>
              </div>

              <div className="footprint-scrollbar max-h-[56vh] space-y-5 overflow-y-auto pr-1 sm:max-h-[62vh]">
                {selectedStory.regions.map((region) => (
                  <section key={region.id} className="space-y-3">
                    <div className="flex items-center justify-between gap-4 px-1">
                      <h4 className="text-[15px] font-bold uppercase tracking-[0.2em] text-white/84 sm:text-[16px]">
                        {region.name}
                      </h4>
                      <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/40">
                        {region.photos.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {region.photos.map((photo, index) => (
                        <figure
                          key={photo.id}
                          className={`footprint-photo-frame rounded-[20px] border border-white/10 ${
                            index === 0 ? "col-span-2" : ""
                          }`}
                        >
                          <div
                            className={`overflow-hidden ${
                              index === 0 ? "aspect-[16/10]" : "aspect-square"
                            }`}
                          >
                            <img
                              src={photo.src}
                              alt={photo.alt}
                              className="h-full w-full object-cover opacity-80"
                            />
                          </div>
                          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-3 py-3">
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                                {region.name}
                              </div>
                              {photo.caption ? (
                                <figcaption className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/70">
                                  {photo.caption}
                                </figcaption>
                              ) : null}
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/44">
                              {index + 1}
                            </span>
                          </div>
                        </figure>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCardVisible(true)}
              className="pointer-events-auto rounded-full border border-white/12 bg-white/10 px-5 py-3 text-[12px] uppercase tracking-[0.28em] text-white/70 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:border-white/20 hover:bg-white/14 hover:text-white lg:mr-6"
            >
              Reopen snapshot card
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Footprint;
