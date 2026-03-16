"use client";

import { Ref, forwardRef, useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { motion, useMotionValue, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  images: string[];
  animationDelay?: number;
}

export function PhotoGallery({ images, animationDelay = 0.2 }: PhotoGalleryProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [validImages, setValidImages] = useState<string[]>([]);

  // Probe all image URLs and keep only the ones that actually load
  useEffect(() => {
    if (images.length === 0) { setValidImages([]); return; }
    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        images.map(
          (url) =>
            new Promise<string | null>((resolve) => {
              const img = new window.Image();
              const timer = setTimeout(() => { img.src = ''; resolve(null); }, 6000);
              img.onload = () => { clearTimeout(timer); resolve(url); };
              img.onerror = () => { clearTimeout(timer); resolve(null); };
              img.src = url;
            }),
        ),
      );
      if (!cancelled) {
        setValidImages(results.filter((u): u is string => u !== null));
      }
    })();

    return () => { cancelled = true; };
  }, [images]);

  useEffect(() => {
    // First make the container visible with a fade-in
    const visibilityTimer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay * 1000);

    // Then start the photo animations after a short delay
    const animationTimer = setTimeout(
      () => {
        setIsLoaded(true);
      },
      (animationDelay + 0.3) * 1000
    );

    return () => {
      clearTimeout(visibilityTimer);
      clearTimeout(animationTimer);
    };
  }, [animationDelay]);

  if (validImages.length === 0) return null;

  // Animation variants for the container
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  // Animation variants for each photo
  const photoVariants = {
    hidden: () => ({
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
    }),
    visible: (custom: { x: any; y: any; order: number }) => ({
      x: custom.x,
      y: custom.y,
      rotate: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 70,
        damping: 12,
        mass: 1,
        delay: custom.order * 0.12,
      },
    }),
  };

  // Calculate photo positions based on number of images and screen size
  const getPhotoPositions = (imageCount: number, isMobile: boolean = false) => {
    const positions = [];

    // Mobile scaling factor (approximately 0.65x)
    const scale = isMobile ? 0.65 : 1;

    if (imageCount === 1) {
      return [{ x: "0px", y: "0px", zIndex: 50, direction: "left" as Direction }];
    }

    if (imageCount === 2) {
      return [
        { x: `${-120 * scale}px`, y: `${10 * scale}px`, zIndex: 50, direction: "left" as Direction },
        { x: `${120 * scale}px`, y: `${10 * scale}px`, zIndex: 40, direction: "right" as Direction },
      ];
    }

    if (imageCount === 3) {
      return [
        { x: `${-200 * scale}px`, y: `${15 * scale}px`, zIndex: 50, direction: "left" as Direction },
        { x: "0px", y: `${8 * scale}px`, zIndex: 40, direction: "left" as Direction },
        { x: `${200 * scale}px`, y: `${22 * scale}px`, zIndex: 30, direction: "right" as Direction },
      ];
    }

    if (imageCount === 4) {
      return [
        { x: `${-270 * scale}px`, y: `${18 * scale}px`, zIndex: 50, direction: "left" as Direction },
        { x: `${-90 * scale}px`, y: `${28 * scale}px`, zIndex: 40, direction: "left" as Direction },
        { x: `${90 * scale}px`, y: `${12 * scale}px`, zIndex: 30, direction: "right" as Direction },
        { x: `${270 * scale}px`, y: `${35 * scale}px`, zIndex: 20, direction: "right" as Direction },
      ];
    }

    // 5 or more images
    return [
      { x: `${-320 * scale}px`, y: `${15 * scale}px`, zIndex: 50, direction: "left" as Direction },
      { x: `${-160 * scale}px`, y: `${32 * scale}px`, zIndex: 40, direction: "left" as Direction },
      { x: "0px", y: `${8 * scale}px`, zIndex: 30, direction: "right" as Direction },
      { x: `${160 * scale}px`, y: `${22 * scale}px`, zIndex: 20, direction: "right" as Direction },
      { x: `${320 * scale}px`, y: `${44 * scale}px`, zIndex: 10, direction: "left" as Direction },
    ];
  };

  // Detect if we're on mobile (you may want to use a hook for this)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const positions = getPhotoPositions(Math.min(validImages.length, 5), isMobile);
  const displayImages = validImages.slice(0, 5);

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);
  const goToNext = () => setSelectedIndex((prev) => (prev !== null ? (prev + 1) % displayImages.length : 0));
  const goToPrev = () => setSelectedIndex((prev) => (prev !== null ? (prev - 1 + displayImages.length) % displayImages.length : 0));

  return (
    <>
      <div className="relative mb-4 sm:mb-8 h-[200px] sm:h-[260px] md:h-[320px] w-full items-center justify-center lg:flex">
        <motion.div
          className="relative mx-auto flex w-full max-w-7xl justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            className="relative flex w-full justify-center"
            variants={containerVariants}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
          >
            <div className="relative h-[140px] w-[140px] sm:h-[180px] sm:w-[180px] md:h-[220px] md:w-[220px]">
              {/* Render photos in reverse order so that higher z-index photos are rendered later in the DOM */}
              {displayImages.map((src, index) => {
                const position = positions[index];
                return (
                  <motion.div
                    key={index}
                    className="absolute left-0 top-0"
                    style={{ zIndex: position.zIndex }}
                    variants={photoVariants}
                    custom={{
                      x: position.x,
                      y: position.y,
                      order: index,
                    }}
                  >
                    <Photo
                      width={isMobile ? 140 : 220}
                      height={isMobile ? 140 : 220}
                      src={src}
                      alt={`Location image ${index + 1}`}
                      direction={position.direction}
                      onClick={() => openLightbox(index)}
                    />
                  </motion.div>
                );
              }).reverse()}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white/80 hover:text-white transition-colors z-[10000] p-2 min-h-11 min-w-11"
            >
              <X size={24} className="sm:w-8 sm:h-8" />
            </button>

            {displayImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                  }}
                  className="absolute left-2 sm:left-4 text-white/80 hover:text-white transition-colors z-[10000] p-2 min-h-11 min-w-11"
                >
                  <ChevronLeft size={36} className="sm:w-12 sm:h-12" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-2 sm:right-4 text-white/80 hover:text-white transition-colors z-[10000] p-2 min-h-11 min-w-11"
                >
                  <ChevronRight size={36} className="sm:w-12 sm:h-12" />
                </button>
              </>
            )}

            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center px-12 sm:px-16"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImages[selectedIndex]}
                alt={`Location image ${selectedIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  console.error('Image failed to load:', displayImages[selectedIndex]);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </motion.div>

            <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs sm:text-sm z-[10000]">
              {selectedIndex + 1} / {displayImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function getRandomNumberInRange(min: number, max: number): number {
  if (min >= max) {
    throw new Error("Min value should be less than max value");
  }
  return Math.random() * (max - min) + min;
}

const MotionImage = motion(
  forwardRef(function MotionImage(
    props: any,
    ref: Ref<HTMLImageElement>
  ) {
    return <Image ref={ref} {...props} />;
  })
);

type Direction = "left" | "right";

export const Photo = ({
  src,
  alt,
  className,
  direction,
  width,
  height,
  onClick,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  direction?: Direction;
  width: number;
  height: number;
  onClick?: () => void;
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const x = useMotionValue(200);
  const y = useMotionValue(200);

  useEffect(() => {
    const randomRotation =
      getRandomNumberInRange(1, 4) * (direction === "left" ? -1 : 1);
    setRotation(randomRotation);
  }, [direction]);

  function handleMouse(event: {
    currentTarget: { getBoundingClientRect: () => any };
    clientX: number;
    clientY: number;
  }) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  }

  const resetMouse = () => {
    x.set(200);
    y.set(200);
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      whileTap={{ scale: 1.2, zIndex: 9999 }}
      whileHover={{
        scale: 1.1,
        rotateZ: 2 * (direction === "left" ? -1 : 1),
        zIndex: 9999,
      }}
      whileDrag={{
        scale: 1.1,
        zIndex: 9999,
      }}
      initial={{ rotate: 0 }}
      animate={{ rotate: rotation }}
      style={{
        width,
        height,
        perspective: 400,
        transform: `rotate(0deg) rotateX(0deg) rotateY(0deg)`,
        zIndex: 1,
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: "none",
      }}
      className={cn(
        className,
        "relative mx-auto shrink-0 cursor-pointer"
      )}
      onMouseMove={handleMouse}
      onMouseLeave={resetMouse}
      onClick={onClick}
      draggable={false}
      tabIndex={0}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-lg">
        <MotionImage
          className={cn("rounded-3xl object-cover")}
          fill
          src={src}
          alt={alt}
          {...props}
          draggable={false}
        />
      </div>
    </motion.div>
  );
};
