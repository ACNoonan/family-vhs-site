#!/bin/bash

# Family VHS Video Upload Script
# This script uploads videos to S3 with progress tracking and resume capability

set -e

# Configuration
USB_PATH="/Volumes/2703299"
S3_BUCKET="s3://noonan-family-vhs-archive/videos/"
AWS_PROFILE="AWS_CLI"
LOG_FILE="/tmp/vhs-upload-$(date +%Y%m%d-%H%M%S).log"
PROGRESS_FILE="/tmp/vhs-upload-progress.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Family VHS Archive - Video Upload Script           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if USB is mounted
if [ ! -d "$USB_PATH" ]; then
    echo -e "${RED}ERROR: USB drive not found at $USB_PATH${NC}"
    echo "Please ensure the USB drive is connected and mounted."
    exit 1
fi

# Count files
TOTAL_FILES=$(find "$USB_PATH" -maxdepth 1 -name "*.mp4" -o -name "*.MP4" 2>/dev/null | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$USB_PATH"/*.mp4 2>/dev/null | tail -1 | awk '{print $1}')

echo -e "${YELLOW}Source:${NC} $USB_PATH"
echo -e "${YELLOW}Destination:${NC} $S3_BUCKET"
echo -e "${YELLOW}Total Files:${NC} $TOTAL_FILES MP4 files"
echo -e "${YELLOW}Log File:${NC} $LOG_FILE"
echo ""

# Check what's already in S3
echo -e "${BLUE}Checking S3 for existing uploads...${NC}"
EXISTING_COUNT=$(aws s3 ls "$S3_BUCKET" --profile "$AWS_PROFILE" 2>/dev/null | grep -c "\.mp4" || echo "0")
EXISTING_SIZE=$(aws s3 ls "$S3_BUCKET" --profile "$AWS_PROFILE" --recursive --human-readable --summarize 2>/dev/null | grep "Total Size" | awk '{print $3, $4}' || echo "0")

echo -e "${GREEN}Already in S3:${NC} $EXISTING_COUNT files ($EXISTING_SIZE)"
echo ""

# Start upload
echo -e "${BLUE}Starting upload (this will skip files already uploaded)...${NC}"
echo -e "${YELLOW}Press Ctrl+C to pause - run this script again to resume${NC}"
echo ""

# Function to show progress
show_progress() {
    while true; do
        sleep 30
        CURRENT=$(aws s3 ls "$S3_BUCKET" --profile "$AWS_PROFILE" --recursive --human-readable --summarize 2>/dev/null)
        COUNT=$(echo "$CURRENT" | grep -c "\.mp4" || echo "0")
        SIZE=$(echo "$CURRENT" | grep "Total Size" | awk '{print $3, $4}')
        echo -e "\n${GREEN}[Progress]${NC} $COUNT / $TOTAL_FILES files uploaded ($SIZE)"
    done
}

# Start progress monitor in background
show_progress &
PROGRESS_PID=$!

# Trap to clean up progress monitor
cleanup() {
    kill $PROGRESS_PID 2>/dev/null || true
    echo ""
    echo -e "${BLUE}Upload paused/complete. Run this script again to check status or resume.${NC}"
}
trap cleanup EXIT

# Run the sync with proper content-type
aws s3 sync "$USB_PATH/" "$S3_BUCKET" \
    --exclude "*" \
    --include "*.mp4" \
    --include "*.MP4" \
    --exclude "._*" \
    --content-type "video/mp4" \
    --profile "$AWS_PROFILE" \
    2>&1 | tee -a "$LOG_FILE"

# Final status
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    UPLOAD COMPLETE!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

# Final count
FINAL_COUNT=$(aws s3 ls "$S3_BUCKET" --profile "$AWS_PROFILE" 2>/dev/null | grep -c "\.mp4" || echo "0")
FINAL_SIZE=$(aws s3 ls "$S3_BUCKET" --profile "$AWS_PROFILE" --recursive --human-readable --summarize 2>/dev/null | grep "Total Size" | awk '{print $3, $4}')

echo -e "${GREEN}Final:${NC} $FINAL_COUNT files uploaded ($FINAL_SIZE)"
echo -e "${GREEN}Log:${NC} $LOG_FILE"


