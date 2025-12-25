import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

export interface VideoFile {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
}

export async function listVideos(): Promise<VideoFile[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: "videos/",
  });

  const response = await s3Client.send(command);
  const contents = response.Contents || [];

  // Filter for video files only
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
  
  return contents
    .filter((item) => {
      const key = item.Key || "";
      return videoExtensions.some((ext) => key.toLowerCase().endsWith(ext));
    })
    .map((item) => ({
      key: item.Key || "",
      name: extractFileName(item.Key || ""),
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

