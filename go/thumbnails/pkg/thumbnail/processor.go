package thumbnail

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/davidbyttow/govips/v2/vips"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/utils"
	"image"
	"os"
	"os/exec"
	"strconv"
)

type Processor interface {
	// GenerateThumbnail creates a thumbnail for a file
	GenerateThumbnail(fileEntry mod.FileEntry) ([]byte, error)

	// SupportsFile checks if the file can be processed
	SupportsFile(fileEntry mod.FileEntry) bool
}

type processor struct {
	baseUrl       string
	ffmpegFormats []string
	imageFormats  []string
}

// NewProcessor creates a new thumbnail processor
func NewProcessor(ffmpegFormats []string, supportedExtensions []string) Processor {
	return &processor{
		baseUrl:       utils.BaseUrl,
		ffmpegFormats: ffmpegFormats,
		imageFormats:  supportedExtensions,
	}
}

// GenerateThumbnail determines the file type and creates an appropriate thumbnail
func (p *processor) GenerateThumbnail(fileEntry mod.FileEntry) ([]byte, error) {
	if !p.SupportsFile(fileEntry) {
		return nil, fmt.Errorf("unsupported file type: %s", fileEntry.MediaType)
	}

	if utils.IsImage(fileEntry.MediaType) {
		return p.generateImageThumbnail(fileEntry)
	} else if utils.IsVideo(fileEntry.MediaType) {
		return p.generateVideoThumbnail(fileEntry.FullFileNameOnSystem)
	}

	return nil, fmt.Errorf("unsupported media type: %s", fileEntry.MediaType)
}

// SupportsFile checks if the file type can be processed
func (p *processor) SupportsFile(fileEntry mod.FileEntry) bool {
	return fileSupported(fileEntry, p.ffmpegFormats, p.imageFormats)
}

// generateVideoThumbnail creates a thumbnail from a video file
func (p *processor) generateVideoThumbnail(videoPath string) ([]byte, error) {
	videoPath = p.baseUrl + "/" + videoPath
	probeCmd := exec.Command("ffprobe", "-v", "error", "-show_format", "-print_format", "json", videoPath)
	probeOut, err := probeCmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve video metadata: %w", err)
	}

	// Decode the JSON output to extract the duration
	var probe ProbeData
	if err = json.Unmarshal(probeOut, &probe); err != nil {
		return nil, fmt.Errorf("failed to parse video metadata: %w", err)
	}
	if probe.Format.Duration == "" {
		return nil, fmt.Errorf("could not determine video duration")
	}

	// Convert the duration string to a float
	duration, err := strconv.ParseFloat(probe.Format.Duration, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid duration value: %w", err)
	}

	// Get a random timestamp from the video
	randomTimestamp := globalFloat64() * duration
	ts := fmt.Sprintf("%.2f", randomTimestamp)

	ffmpegArgs := []string{
		"-ss", ts,
		"-i", videoPath,
		"-frames:v", "1",
		"-f", "image2",
		"-vcodec", "mjpeg",
		"-q:v", "10",
		"-vf", "scale=-1:200",
		"-skip_frame", "nokey",
		"-skip_loop_filter", "all",
		"pipe:1",
	}

	ffmpegCmd := exec.Command("ffmpeg", ffmpegArgs...)
	var buf bytes.Buffer
	ffmpegCmd.Stdout = &buf

	if err := ffmpegCmd.Run(); err != nil {
		return nil, fmt.Errorf("failed to generate video thumbnail: %w", err)
	}

	return buf.Bytes(), nil
}

// generateImageThumbnail creates a thumbnail from an image file
func (p *processor) generateImageThumbnail(fileEntry mod.FileEntry) ([]byte, error) {
	file := p.baseUrl + "/" + fileEntry.FullFileNameOnSystem

	intSet := vips.IntParameter{}
	intSet.Set(-1)

	width, height, err := getResizedDimensions(file)
	if err != nil {
		return nil, err
	}

	var importParams *vips.ImportParams

	if isAnimatedImage(fileEntry.Extension) {
		importParams = &vips.ImportParams{
			NumPages: intSet,
		}
	} else {
		importParams = vips.NewImportParams()
	}

	vipsImage, err := vips.LoadThumbnailFromFile(
		file,
		width,
		height,
		vips.InterestingCentre,
		vips.SizeDown,
		importParams,
	)
	if err != nil {
		return nil, err
	}

	err = vipsImage.AutoRotate()
	if err != nil {
		return nil, err
	}

	err = vipsImage.RemoveMetadata("delay", "dispose", "loop", "loop_count")
	if err != nil {
		return nil, err
	}

	webp, _, err := vipsImage.ExportWebp(nil)
	if err != nil {
		return nil, err
	}
	return webp, nil
}

// getResizedDimensions calculates new dimensions while maintaining the aspect ratio
func getResizedDimensions(filePath string) (newWidth, newHeight int, err error) {
	// Open the image file
	file, err := os.Open(filePath)
	if err != nil {
		return 0, 0, err
	}
	defer file.Close()

	// Decode only the image configuration (metadata) without reading the entire image
	config, _, err := image.DecodeConfig(file)
	if err != nil {
		return 0, 0, err
	}

	origWidth := config.Width
	origHeight := config.Height

	if origWidth == 0 {
		return 0, 0, nil
	}

	// Fix the new width to the default and calculate the scaling factor
	newWidth = DefaultThumbnailWidth
	scaleFactor := float64(newWidth) / float64(origWidth)
	newHeight = int(float64(origHeight) * scaleFactor)

	return
}
