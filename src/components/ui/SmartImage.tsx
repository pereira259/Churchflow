import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    containerClassName?: string;
    fallbackIcon?: React.ReactNode;
    skeletonClassName?: string;
}

export function SmartImage({
    src,
    alt,
    className,
    containerClassName,
    fallbackIcon,
    skeletonClassName,
    loading = "lazy",
    ...props
}: SmartImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const handleLoad = () => {
        setIsLoaded(true);
        setError(false);
    };

    const handleError = () => {
        if (retryCount < 2) {
            setTimeout(() => {
                setRetryCount(prev => prev + 1);
            }, 1000 * (retryCount + 1));
        } else {
            setError(true);
            setIsLoaded(true);
        }
    };

    useEffect(() => {
        setIsLoaded(false);
        setError(false);
        setRetryCount(0);
    }, [src]);

    // Preload above-the-fold images immediately
    useEffect(() => {
        if (loading === 'eager' && src) {
            const img = new Image();
            img.src = src;
        }
    }, [src, loading]);

    return (
        <div className={cn("relative overflow-hidden", containerClassName)}>
            {/* Shimmer skeleton — adapts to card theme via skeletonClassName */}
            {!isLoaded && !error && (
                <div
                    className={cn(
                        "absolute inset-0 w-full h-full z-10",
                        skeletonClassName || "bg-slate-200 animate-pulse"
                    )}
                    style={!skeletonClassName ? undefined : {
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.4s infinite',
                    }}
                />
            )}

            {error ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-300 animate-in fade-in duration-500">
                    {fallbackIcon || <ImageOff className="w-1/3 h-1/3 opacity-20" />}
                </div>
            ) : (
                <motion.img
                    key={`${src}-${retryCount}`}
                    src={src}
                    alt={alt}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isLoaded ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading={loading}
                    className={cn(
                        "w-full h-full object-cover object-center",
                        className
                    )}
                    {...props}
                />
            )}
        </div>
    );
}
