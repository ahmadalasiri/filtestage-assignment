import React, { useRef, useState, useEffect } from "react";
import { Box } from "@mui/material";

const BRUSH_SIZES = [2, 4, 6, 8];

/**
 * A canvas component for drawing annotations on images
 */
const AnnotationCanvas = ({
  width,
  height,
  imageUrl,
  onAnnotationChange,
  initialAnnotation = null,
}) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [history, setHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Load the actual image to determine its proper dimensions
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      // Get actual image dimensions
      const aspectRatio = img.width / img.height;

      // Determine canvas size while maintaining aspect ratio
      let canvasWidth = width;
      let canvasHeight = height;

      // Adjust dimensions to maintain aspect ratio
      if (width / height > aspectRatio) {
        // Container is wider than image
        canvasWidth = height * aspectRatio;
      } else {
        // Container is taller than image
        canvasHeight = width / aspectRatio;
      }

      setImageDimensions({
        width: canvasWidth,
        height: canvasHeight,
      });
      setImageLoaded(true);
    };
    img.src = imageUrl;
    imageRef.current = img;
  }, [imageUrl, width, height]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    setContext(ctx);

    // Set canvas dimensions to match the image proportion
    canvas.width = imageDimensions.width;
    canvas.height = imageDimensions.height;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If there's an initial annotation, draw it
    if (initialAnnotation) {
      const annotationImage = new Image();
      annotationImage.src = initialAnnotation;
      annotationImage.onload = () => {
        // Draw the annotation to match the canvas size
        ctx.drawImage(annotationImage, 0, 0, canvas.width, canvas.height);
        saveCanvasState();
      };
    } else {
      saveCanvasState();
    }
  }, [imageLoaded, imageDimensions, initialAnnotation]);

  // Save current canvas state to history
  const saveCanvasState = () => {
    if (!canvasRef.current || !context) return;

    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL("image/png");

    // If we're in the middle of the history, remove all future states
    if (currentStep < history.length - 1) {
      setHistory(history.slice(0, currentStep + 1));
    }

    setHistory([...history, imageData]);
    setCurrentStep(currentStep + 1);

    // Notify parent component of the annotation
    if (onAnnotationChange) {
      onAnnotationChange(imageData);
    }
  };

  // Start drawing
  const startDrawing = (e) => {
    if (!context) return;

    const { offsetX, offsetY } = getCoordinates(e);

    context.beginPath();
    context.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  // Draw on the canvas
  const draw = (e) => {
    if (!isDrawing || !context) return;

    const { offsetX, offsetY } = getCoordinates(e);

    context.lineTo(offsetX, offsetY);
    // Use the globally set color if available, or fall back to red
    const color = window.selectedAnnotationColor || "#FF0000";
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
  };

  // Stop drawing
  const stopDrawing = () => {
    if (!isDrawing || !context) return;

    context.closePath();
    setIsDrawing(false);
    saveCanvasState();
  };

  // Handle touch events
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
    };
    startDrawing(mouseEvent);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
    };
    draw(mouseEvent);
  };

  // Get coordinates for both mouse and touch events
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calculate scaling factor between the canvas display size and its internal dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      offsetX: (e.clientX - rect.left) * scaleX,
      offsetY: (e.clientY - rect.top) * scaleY,
    };
  };

  // Render the component
  return (
    <Box sx={{ display: "flex", position: "relative" }}>
      {imageLoaded && (
        <Box sx={{ position: "relative" }}>
          <Box
            sx={{
              width: imageDimensions.width,
              height: imageDimensions.height,
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              border: "1px solid #ddd",
              borderRadius: 1,
              position: "relative",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                cursor: "crosshair",
                touchAction: "none", // Added to disable browser touch gestures
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing} // Added to handle touch cancellation
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AnnotationCanvas;
