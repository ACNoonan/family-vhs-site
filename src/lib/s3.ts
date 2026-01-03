import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";
const METADATA_KEY = "metadata/videos.json";

export interface VideoFile {
  key: string;
  name: string;
  displayName?: string;
  size: number;
  lastModified: Date;
  thumbnailUrl?: string;
  previewUrl?: string;
}

export interface VideoMetadata {
  [key: string]: {
    displayName?: string;
    dateRange?: string;
  };
}

// Fetch video metadata from S3
async function getVideoMetadata(): Promise<VideoMetadata> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: METADATA_KEY,
    });
    const response = await s3Client.send(command);
    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : {};
  } catch {
    // Metadata file doesn't exist yet
    return {};
  }
}

// Save video metadata to S3
export async function saveVideoMetadata(
  metadata: VideoMetadata
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: METADATA_KEY,
    Body: JSON.stringify(metadata, null, 2),
    ContentType: "application/json",
  });
  await s3Client.send(command);
}

// Update a single video's display name
export async function updateVideoDisplayName(
  videoKey: string,
  displayName: string
): Promise<void> {
  const metadata = await getVideoMetadata();
  metadata[videoKey] = {
    ...metadata[videoKey],
    displayName,
  };
  await saveVideoMetadata(metadata);
}

// Check if a file exists in S3
async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: key,
      MaxKeys: 1,
    });
    const response = await s3Client.send(command);
    return (response.Contents?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function listVideos(): Promise<VideoFile[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: "videos/",
  });

  const response = await s3Client.send(command);
  const contents = response.Contents || [];

  // Get metadata for display names
  const metadata = await getVideoMetadata();

  // Filter for video files only
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

  const videos = contents
    .filter((item) => {
      const key = item.Key || "";
      // Filter for video files and exclude macOS resource forks (._*)
      const isVideo = videoExtensions.some((ext) => key.toLowerCase().endsWith(ext));
      const isResourceFork = key.includes("/._") || key.startsWith("._");
      return isVideo && !isResourceFork;
    })
    .map((item) => {
      const key = item.Key || "";
      const baseName = extractFileName(key);
      const videoMeta = metadata[key] || {};

      return {
        key,
        name: baseName,
        displayName: videoMeta.displayName,
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Check for thumbnails/previews and generate signed URLs
  const videosWithMedia = await Promise.all(
    videos.map(async (video) => {
      const baseName = video.name;
      const thumbKey = `thumbnails/${baseName}.jpg`;
      const previewKey = `previews/${baseName}.mp4`;

      const [hasThumb, hasPreview] = await Promise.all([
        fileExists(thumbKey),
        fileExists(previewKey),
      ]);

      let thumbnailUrl: string | undefined;
      let previewUrl: string | undefined;

      if (hasThumb) {
        thumbnailUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({ Bucket: BUCKET_NAME, Key: thumbKey }),
          { expiresIn: 14400 }
        );
      }

      if (hasPreview) {
        previewUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({ Bucket: BUCKET_NAME, Key: previewKey }),
          { expiresIn: 14400 }
        );
      }

      return {
        ...video,
        thumbnailUrl,
        previewUrl,
      };
    })
  );

  return videosWithMedia;
}

export async function getVideoSignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  // URL expires in 4 hours
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 14400 });
  return signedUrl;
}

function extractFileName(key: string): string {
  // Remove the "videos/" prefix and get just the filename
  const filename = key.replace(/^videos\//, "");
  // Remove extension for display
  return filename.replace(/\.[^/.]+$/, "");
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}



