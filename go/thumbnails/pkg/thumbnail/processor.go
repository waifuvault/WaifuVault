package thumbnail

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	"io"
	"mime/multipart"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/davidbyttow/govips/v2/vips"
	"github.com/samber/lo"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"golang.org/x/image/webp"
)

type Processor interface {
	// GenerateThumbnail creates a thumbnail for a file
	GenerateThumbnail(fileEntry mod.FileEntry) ([]byte, error)

	// SupportsFile checks if the file can be processed
	SupportsFile(fileEntry mod.FileEntry) bool

	// GenerateThumbnailFromMultipart creates a thumbnail for a multipart file
	GenerateThumbnailFromMultipart(file multipart.File, header *multipart.FileHeader, animate bool) ([]byte, error)

	// SupportsMultipartFile checks if the multipart file can be processed
	SupportsMultipartFile(header *multipart.FileHeader) bool
}

type processor struct {
	baseUrl       string
	ffmpegFormats []string
	imageFormats  []string
}

// NewProcessor creates a new thumbnail processor
func NewProcessor(ffmpegFormats []string, supportedExtensions []string) Processor {
	return &processor{
		baseUrl:       utils.FileBaseUrl,
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

// GenerateThumbnailFromMultipart creates a thumbnail for a multipart file
func (p *processor) GenerateThumbnailFromMultipart(file multipart.File, header *multipart.FileHeader, animate bool) ([]byte, error) {
	if !p.SupportsMultipartFile(header) {
		return nil, fmt.Errorf("unsupported file type: %s", header.Header.Get("Content-Type"))
	}

	extension := getExtensionFromFilename(header.Filename)

	tempFile, err := os.CreateTemp("", "thumbnail-*"+extension)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	_, err = io.Copy(tempFile, file)
	if err != nil {
		return nil, fmt.Errorf("failed to copy file content: %w", err)
	}

	mediaType := header.Header.Get("Content-Type")

	if utils.IsImage(mediaType) {
		return p.generateImageThumbnailFromFile(tempFile.Name(), extension, animate)
	} else if utils.IsVideo(mediaType) {
		return p.generateVideoThumbnailFromPath(tempFile.Name())
	}

	return nil, fmt.Errorf("unsupported media type: %s", mediaType)
}

// SupportsMultipartFile checks if the multipart file can be processed
func (p *processor) SupportsMultipartFile(header *multipart.FileHeader) bool {
	mediaType := header.Header.Get("Content-Type")
	extension := getExtensionFromFilename(header.Filename)

	return (utils.IsImage(mediaType) && lo.Contains(p.imageFormats, extension)) ||
		(utils.IsVideo(mediaType) && lo.Contains(p.ffmpegFormats, extension))
}

// generateVideoThumbnail creates a thumbnail from a video file
func (p *processor) generateVideoThumbnail(videoPath string) ([]byte, error) {
	fullPath := p.baseUrl + "/" + videoPath
	return p.generateVideoThumbnailFromPath(fullPath)
}

// generateImageThumbnail creates a thumbnail from an image file (streaming)
func (p *processor) generateImageThumbnail(fileEntry mod.FileEntry) ([]byte, error) {
	file := p.baseUrl + "/" + fileEntry.FullFileNameOnSystem
	return p.generateImageThumbnailFromFile(file, fileEntry.Extension, true)
}

// generateImageThumbnailFromFile creates a thumbnail from an image file path
func (p *processor) generateImageThumbnailFromFile(filePath, extension string, animate bool) ([]byte, error) {
	if isAnimatedImage(extension) {
		hasMultipleFrames, err := p.checkIfActuallyAnimated(filePath)
		if err != nil {
			return p.generateStaticThumbnail(filePath, extension)
		}

		if hasMultipleFrames {
			if animate {
				return p.generateAnimatedThumbnail(filePath, extension)
			}
			return p.generateFirstFrameThumbnail(filePath, extension)
		}
	}

	return p.generateStaticThumbnail(filePath, extension)
}

// checkIfActuallyAnimated checks if a file actually has multiple frames using LoadThumbnailFromFile
func (p *processor) checkIfActuallyAnimated(filePath string) (bool, error) {
	intSet := vips.IntParameter{}
	intSet.Set(-1)
	importParams := &vips.ImportParams{NumPages: intSet}

	vipsImage, err := vips.LoadThumbnailFromFile(filePath, 100, 100, vips.InterestingCentre, vips.SizeDown, importParams)
	if err != nil {
		return false, err
	}
	defer vipsImage.Close()

	pages := vipsImage.Pages()
	return pages > 1, nil
}

// generateAnimatedThumbnail handles animated images (memory-intensive but preserves animation)
func (p *processor) generateAnimatedThumbnail(filePath, extension string) ([]byte, error) {
	importParams := p.getImportParams(extension)
	vipsImage, err := vips.LoadImageFromFile(filePath, importParams)
	if err != nil {
		return nil, err
	}
	defer vipsImage.Close()

	err = vipsImage.ThumbnailWithSize(DefaultThumbnailWidth, 0, vips.InterestingNone, vips.SizeDown)
	if err != nil {
		return nil, err
	}

	if err := vipsImage.AutoRotate(); err != nil {
		return nil, err
	}

	if err := vipsImage.RemoveMetadata("delay", "dispose", "loop", "loop_count"); err != nil {
		return nil, err
	}

	thumbnail, _, err := vipsImage.ExportWebp(nil)
	if err != nil {
		return nil, err
	}
	return thumbnail, nil
}

// generateFirstFrameThumbnail extracts only the first frame from animated images
func (p *processor) generateFirstFrameThumbnail(filePath, extension string) ([]byte, error) {
	importParams := &vips.ImportParams{}
	if isAnimatedImage(extension) {
		intSet := vips.IntParameter{}
		intSet.Set(1)
		importParams.NumPages = intSet
	}

	width, height, err := getResizedDimensions(filePath, extension)
	if err != nil {
		return nil, err
	}

	vipsImage, err := vips.LoadThumbnailFromFile(filePath, width, height, vips.InterestingCentre, vips.SizeDown, importParams)
	if err != nil {
		return nil, err
	}

	return p.processVipsImage(vipsImage)
}

// generateStaticThumbnail handles static images (memory-efficient streaming approach)
func (p *processor) generateStaticThumbnail(filePath, extension string) ([]byte, error) {
	width, height, err := getResizedDimensions(filePath, extension)
	if err != nil {
		return nil, err
	}

	importParams := p.getImportParams(extension)
	vipsImage, err := vips.LoadThumbnailFromFile(filePath, width, height, vips.InterestingCentre, vips.SizeDown, importParams)
	if err != nil {
		return nil, err
	}

	return p.processVipsImage(vipsImage)
}

// processVipsImage applies common processing to a vips image and exports as WebP
func (p *processor) processVipsImage(vipsImage *vips.ImageRef) ([]byte, error) {
	defer vipsImage.Close()

	if err := vipsImage.AutoRotate(); err != nil {
		return nil, err
	}

	if err := vipsImage.RemoveMetadata("delay", "dispose", "loop", "loop_count"); err != nil {
		return nil, err
	}

	thumbnail, _, err := vipsImage.ExportWebp(nil)
	if err != nil {
		return nil, err
	}
	return thumbnail, nil
}

// getImportParams returns vips import parameters for the given extension
func (p *processor) getImportParams(extension string) *vips.ImportParams {
	if isAnimatedImage(extension) {
		intSet := vips.IntParameter{}
		intSet.Set(-1)
		return &vips.ImportParams{NumPages: intSet}
	}
	return vips.NewImportParams()
}

// generateVideoThumbnailFromPath creates a thumbnail from a video file path (without baseUrl prefix)
func (p *processor) generateVideoThumbnailFromPath(videoPath string) ([]byte, error) {
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

func getExtensionFromFilename(filename string) string {
	lastDot := strings.LastIndex(filename, ".")
	if lastDot == -1 {
		return ""
	}
	return strings.ToLower(filename[lastDot+1:])
}

func getResizedDimensions(filePath, extension string) (newWidth, newHeight int, err error) {
	file, err := os.Open(filePath)
	if err != nil {
		return 0, 0, err
	}
	defer file.Close()

	origWidth, origHeight, err := getImageDimensions(file, extension)
	if err != nil {
		return 0, 0, err
	}
	return calculateThumbnailDimensions(origWidth, origHeight)
}

// getImageDimensions extracts width and height from any io.ReadSeeker
func getImageDimensions(reader io.ReadSeeker, extension string) (width, height int, err error) {
	if strings.ToLower(extension) == "webp" {
		img, err := webp.Decode(reader)
		if err != nil {
			return 0, 0, err
		}
		bounds := img.Bounds()
		return bounds.Dx(), bounds.Dy(), nil
	} else {
		reader.Seek(0, 0) // Reset to beginning for non-WebP
		config, _, err := image.DecodeConfig(reader)
		if err != nil {
			return 0, 0, err
		}
		return config.Width, config.Height, nil
	}
}

// calculateThumbnailDimensions calculates scaled dimensions maintaining the aspect ratio
func calculateThumbnailDimensions(origWidth, origHeight int) (newWidth, newHeight int, err error) {
	if origWidth == 0 {
		return 0, 0, nil
	}

	newWidth = DefaultThumbnailWidth
	scaleFactor := float64(newWidth) / float64(origWidth)
	newHeight = int(float64(origHeight) * scaleFactor)
	return newWidth, newHeight, nil
}
