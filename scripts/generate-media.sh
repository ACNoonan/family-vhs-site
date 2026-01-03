#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# VHS Archive - Thumbnail & Preview Generator
# ═══════════════════════════════════════════════════════════════════════════
# Generates:
#   - Static thumbnails (JPG) - extracted at 10% into video
#   - Hover preview clips (MP4) - 5 second clips, lower quality for fast loading
#
# Note: Downloads videos temporarily because FFmpeg can't process S3 signed URLs
#
# Usage: ./scripts/generate-media.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Configuration
S3_BUCKET="noonan-family-vhs-archive"
AWS_PROFILE="AWS_CLI"
TEMP_DIR="/tmp/vhs-media-gen"
PREVIEW_DURATION=5
PREVIEW_START_PERCENT=10  # Start preview at 10% into video

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}         VHS Archive - Media Generator                         ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Check dependencies
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}Error: ffmpeg is not installed${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Create temp directory
mkdir -p "$TEMP_DIR"

echo -e "\n${YELLOW}Fetching video list from S3...${NC}"

# Get list of videos from S3 (excluding macOS resource forks ._*)
VIDEO_LIST=$(aws s3 ls "s3://${S3_BUCKET}/videos/" --profile "$AWS_PROFILE" | grep -E '\.(mp4|mov|avi|mkv|webm)$' | awk '{print $4}' | grep -v '^\._')

if [ -z "$VIDEO_LIST" ]; then
    echo -e "${RED}No videos found in s3://${S3_BUCKET}/videos/${NC}"
    exit 1
fi

# Count videos
TOTAL=$(echo "$VIDEO_LIST" | wc -l | tr -d ' ')
echo -e "${GREEN}Found ${TOTAL} videos to process${NC}\n"

# Check existing thumbnails and previews
EXISTING_THUMBS=$(aws s3 ls "s3://${S3_BUCKET}/thumbnails/" --profile "$AWS_PROFILE" 2>/dev/null | wc -l | tr -d ' ')
EXISTING_PREVIEWS=$(aws s3 ls "s3://${S3_BUCKET}/previews/" --profile "$AWS_PROFILE" 2>/dev/null | wc -l | tr -d ' ')
echo -e "${BLUE}Existing thumbnails: ${EXISTING_THUMBS}${NC}"
echo -e "${BLUE}Existing previews: ${EXISTING_PREVIEWS}${NC}\n"

CURRENT=0
SKIPPED=0
PROCESSED=0

for VIDEO_NAME in $VIDEO_LIST; do
    CURRENT=$((CURRENT + 1))
    BASE_NAME="${VIDEO_NAME%.*}"
    THUMB_KEY="thumbnails/${BASE_NAME}.jpg"
    PREVIEW_KEY="previews/${BASE_NAME}.mp4"
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}[${CURRENT}/${TOTAL}]${NC} ${VIDEO_NAME}"
    
    # Check if both thumbnail and preview already exist
    THUMB_EXISTS=$(aws s3 ls "s3://${S3_BUCKET}/${THUMB_KEY}" --profile "$AWS_PROFILE" 2>/dev/null | wc -l)
    PREVIEW_EXISTS=$(aws s3 ls "s3://${S3_BUCKET}/${PREVIEW_KEY}" --profile "$AWS_PROFILE" 2>/dev/null | wc -l)
    
    if [ "$THUMB_EXISTS" -gt 0 ] && [ "$PREVIEW_EXISTS" -gt 0 ]; then
        echo -e "  ${YELLOW}⏭  Already processed, skipping${NC}"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    LOCAL_VIDEO="$TEMP_DIR/${VIDEO_NAME}"
    LOCAL_THUMB="$TEMP_DIR/${BASE_NAME}.jpg"
    LOCAL_PREVIEW="$TEMP_DIR/${BASE_NAME}.mp4"
    
    # Download video from S3
    echo -e "  ${BLUE}📥 Downloading video...${NC}"
    aws s3 cp "s3://${S3_BUCKET}/videos/${VIDEO_NAME}" "$LOCAL_VIDEO" \
        --profile "$AWS_PROFILE" \
        --only-show-errors
    
    if [ ! -f "$LOCAL_VIDEO" ]; then
        echo -e "  ${RED}⚠  Download failed, skipping${NC}"
        continue
    fi
    
    # Get video duration
    echo -e "  ${BLUE}📊 Analyzing video...${NC}"
    DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$LOCAL_VIDEO" 2>/dev/null || echo "0")
    
    if [ "$DURATION" = "0" ] || [ -z "$DURATION" ]; then
        echo -e "  ${YELLOW}⚠  Could not get duration, using default (30s)${NC}"
        START_TIME=30
    else
        # Calculate start time (10% into video)
        START_TIME=$(echo "$DURATION * 0.10" | bc 2>/dev/null || echo "30")
        echo -e "  ${GREEN}Duration: ${DURATION}s, extracting at ${START_TIME}s${NC}"
    fi
    
    # Generate thumbnail if not exists
    if [ "$THUMB_EXISTS" -eq 0 ]; then
        echo -e "  ${BLUE}🖼  Generating thumbnail...${NC}"
        ffmpeg -ss "$START_TIME" -i "$LOCAL_VIDEO" \
            -vframes 1 \
            -vf "scale=640:-2" \
            -q:v 2 \
            -update 1 \
            -y "$LOCAL_THUMB" 2>/dev/null
        
        if [ -f "$LOCAL_THUMB" ]; then
            THUMB_SIZE=$(ls -lh "$LOCAL_THUMB" | awk '{print $5}')
            echo -e "  ${BLUE}☁️  Uploading thumbnail (${THUMB_SIZE})...${NC}"
            aws s3 cp "$LOCAL_THUMB" "s3://${S3_BUCKET}/${THUMB_KEY}" \
                --content-type "image/jpeg" \
                --profile "$AWS_PROFILE" \
                --only-show-errors
            rm "$LOCAL_THUMB"
            echo -e "  ${GREEN}✓  Thumbnail uploaded${NC}"
        else
            echo -e "  ${RED}⚠  Thumbnail generation failed${NC}"
        fi
    else
        echo -e "  ${YELLOW}⏭  Thumbnail exists, skipping${NC}"
    fi
    
    # Generate preview clip if not exists
    if [ "$PREVIEW_EXISTS" -eq 0 ]; then
        echo -e "  ${BLUE}🎬 Generating preview clip (${PREVIEW_DURATION}s)...${NC}"
        ffmpeg -ss "$START_TIME" -i "$LOCAL_VIDEO" \
            -t "$PREVIEW_DURATION" \
            -vf "scale=480:-2" \
            -c:v libx264 -preset fast -crf 28 \
            -an \
            -movflags +faststart \
            -y "$LOCAL_PREVIEW" 2>/dev/null
        
        if [ -f "$LOCAL_PREVIEW" ]; then
            PREVIEW_SIZE=$(ls -lh "$LOCAL_PREVIEW" | awk '{print $5}')
            echo -e "  ${BLUE}☁️  Uploading preview (${PREVIEW_SIZE})...${NC}"
            aws s3 cp "$LOCAL_PREVIEW" "s3://${S3_BUCKET}/${PREVIEW_KEY}" \
                --content-type "video/mp4" \
                --profile "$AWS_PROFILE" \
                --only-show-errors
            rm "$LOCAL_PREVIEW"
            echo -e "  ${GREEN}✓  Preview uploaded${NC}"
        else
            echo -e "  ${RED}⚠  Preview generation failed${NC}"
        fi
    else
        echo -e "  ${YELLOW}⏭  Preview exists, skipping${NC}"
    fi
    
    # Clean up downloaded video
    rm -f "$LOCAL_VIDEO"
    
    PROCESSED=$((PROCESSED + 1))
    echo -e "  ${GREEN}✓  Complete${NC}"
done

# Final cleanup
rm -rf "$TEMP_DIR"

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}All done!${NC}"
echo -e "  Processed: ${PROCESSED}"
echo -e "  Skipped (already done): ${SKIPPED}"
echo -e "  Total videos: ${TOTAL}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
