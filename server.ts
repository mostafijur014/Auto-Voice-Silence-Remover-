import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs-extra";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, "uploads");
const OUTPUTS_DIR = path.join(__dirname, "outputs");

// Ensure directories exist
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(OUTPUTS_DIR);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

  const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  // API Routes
  app.post("/api/upload", upload.single("audio"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const inputPath = req.file.path;
    const outputPath = path.join(OUTPUTS_DIR, `processed-${req.file.filename}`);
    
    const threshold = req.body.threshold || "-50dB";
    const duration = req.body.duration || "0.5";
    const autoMode = req.body.autoMode === "true";
    const outputFormat = req.body.outputFormat || "mp3"; // Default to mp3

    try {
      let finalThreshold = threshold;
      
      if (autoMode) {
        // Auto Mode Logic: Analyze loudness
        const stats = await new Promise<any>((resolve, reject) => {
          ffmpeg(inputPath)
            .audioFilters("volumedetect")
            .format("null")
            .on("error", reject)
            .on("end", (stdout, stderr) => {
              const meanVolumeMatch = stderr.match(/mean_volume: ([\-\d\.]+) dB/);
              resolve({
                meanVolume: meanVolumeMatch ? parseFloat(meanVolumeMatch[1]) : -30,
              });
            })
            .save("/dev/null");
        });

        finalThreshold = `${Math.min(stats.meanVolume - 10, -40)}dB`;
      }

      // Process with FFmpeg silenceremove and convert format
      const outputFilename = `processed-${path.parse(req.file.filename).name}.${outputFormat}`;
      const outputPath = path.join(OUTPUTS_DIR, outputFilename);

      await new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath)
          .audioFilters(`silenceremove=stop_periods=-1:stop_duration=${duration}:stop_threshold=${finalThreshold}`);
        
        if (outputFormat === "mp3") {
          command = command.toFormat("mp3").audioBitrate("192k");
        } else if (outputFormat === "wav") {
          command = command.toFormat("wav");
        }

        command
          .on("error", reject)
          .on("end", resolve)
          .save(outputPath);
      });

      // Get durations for comparison
      const getDuration = (file: string) => new Promise<number>((resolve) => {
        ffmpeg.ffprobe(file, (err, metadata) => {
          if (err) {
            console.error(`ffprobe error for ${file}:`, err);
            resolve(0);
          } else {
            resolve(metadata?.format?.duration || 0);
          }
        });
      });

      console.log(`Getting durations for ${inputPath} and ${outputPath}`);
      const beforeDuration = await getDuration(inputPath);
      const afterDuration = await getDuration(outputPath);

      console.log(`Processing successful. Before: ${beforeDuration}s, After: ${afterDuration}s`);
      res.json({
        success: true,
        filename: outputFilename,
        beforeDuration,
        afterDuration,
        downloadUrl: `/api/download/${outputFilename}`
      });

    } catch (error: any) {
      console.error("Processing failed with error:", error);
      res.status(500).json({ 
        error: "Processing failed", 
        details: error.message || String(error) 
      });
    }
  });

  app.get("/api/download/:filename", (req, res) => {
    const filePath = path.join(OUTPUTS_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = ext === ".wav" ? "audio/wav" : "audio/mpeg";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.filename}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // Global Error Handler to ensure JSON responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global error handler:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
