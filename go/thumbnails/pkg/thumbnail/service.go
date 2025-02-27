package thumbnail

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/davidbyttow/govips/v2/vips"
	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/utils"
	"math/rand"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	globalRand   = rand.New(rand.NewSource(time.Now().UnixNano()))
	globalRandMu sync.Mutex
)

// globalFloat64 returns a random float64 in a thread-safe manner.
func globalFloat64() float64 {
	globalRandMu.Lock()
	defer globalRandMu.Unlock()
	return globalRand.Float64()
}

type Service interface {
	GenerateThumbnails(files []mod.FileEntry) error
	GetAllSupportedExtensions() []string
}

type probeData struct {
	Format struct {
		Duration string `json:"duration"`
	} `json:"format"`
}

type service struct {
	dao           dao.Dao
	FfmpegFormats []string
}

func NewService(daoService dao.Dao) Service {
	vips.Startup(&vips.Config{})
	vips.LoggingSettings(nil, vips.LogLevelError)
	formats, err := utils.GetFfmpegSupportedVideoFormats()
	if err != nil {
		panic(err)
	}
	return &service{
		daoService,
		formats,
	}
}

func (s *service) GetAllSupportedExtensions() []string {
	var formats []string

	formats = append(formats, "jpg", "mkv")
	for _, f := range s.FfmpegFormats {
		formats = append(formats, f)
	}
	formats = append(formats, s.FfmpegFormats...)
	return formats
}

func (s *service) fileSupported(file mod.FileEntry) bool {
	if utils.IsImage(file.MediaType) {
		for _, ext := range s.GetAllSupportedExtensions() {
			lower := strings.ToLower(file.Extension)
			if lower == "jpg" || strings.ToLower(ext) == lower {
				return true
			}
		}
	} else if utils.IsVideo(file.MediaType) {
		return s.IsFormatSupportedByFfmpeg(file.Extension)
	}
	return false
}

func (s *service) GenerateThumbnails(files []mod.FileEntry) error {
	numWorkers := 4
	filesChan := make(chan mod.FileEntry)
	resultsChan := make(chan mod.Thumbnail)

	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for file := range filesChan {
				if !s.fileSupported(file) {
					continue
				}
				var thumbnailBytes []byte
				var err error
				if utils.IsImage(file.MediaType) {
					thumbnailBytes, err = generateImageThumbnail(file.FullFileNameOnSystem)
					if err != nil {
						log.Err(err).Msg("Error generating image thumbnail")
						continue
					}
				} else if utils.IsVideo(file.MediaType) {
					thumbnailBytes, err = generateVideoThumbnail(file.FullFileNameOnSystem)
					if err != nil {
						log.Err(err).Msg("Error generating video thumbnail")
						continue
					}
				} else {
					continue
				}
				resultsChan <- mod.Thumbnail{
					Data:   base64.StdEncoding.EncodeToString(thumbnailBytes),
					FileId: file.Id,
				}
			}
		}()
	}

	go func() {
		for _, f := range files {
			filesChan <- f
		}
		close(filesChan)
	}()

	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	var thumbnailStructs []mod.Thumbnail
	for thumbnail := range resultsChan {
		thumbnailStructs = append(thumbnailStructs, thumbnail)
	}

	_, err := s.dao.SaveThumbnails(thumbnailStructs)
	if err != nil {
		return err
	}

	return nil
}

func (s *service) IsFormatSupportedByFfmpeg(extension string) bool {
	// Check if the extension is directly supported.
	for _, f := range s.FfmpegFormats {
		if f == extension || extension == "mkv" && f == "matroska" {
			return true
		}
	}
	return false
}

func generateVideoThumbnail(videoPath string) ([]byte, error) {
	videoPath = utils.BaseUrl + "/" + videoPath
	probeCmd := exec.Command("ffprobe", "-v", "error", "-show_format", "-print_format", "json", videoPath)
	probeOut, err := probeCmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve video metadata: %w", err)
	}

	// Decode the JSON output to extract the duration.
	var probe probeData
	if err := json.Unmarshal(probeOut, &probe); err != nil {
		return nil, fmt.Errorf("failed to parse video metadata: %w", err)
	}
	if probe.Format.Duration == "" {
		return nil, fmt.Errorf("could not determine video duration")
	}

	// Convert the duration string to a float.
	duration, err := strconv.ParseFloat(probe.Format.Duration, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid duration value: %w", err)
	}

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

func generateImageThumbnail(fileName string) ([]byte, error) {
	file := utils.BaseUrl + "/" + fileName

	intSet := vips.IntParameter{}
	intSet.Set(-1)
	params := vips.NewImportParams()
	params.NumPages = intSet

	image, err := vips.LoadImageFromFile(file, params)
	if err != nil {
		return nil, err
	}

	err = image.ThumbnailWithSize(400, 0, vips.InterestingNone, vips.SizeDown)
	if err != nil {
		return nil, err
	}

	err = image.RemoveMetadata("delay", "dispose", "loop", "loop_count")
	if err != nil {
		return nil, err
	}

	webp, _, err := image.ExportWebp(nil)
	if err != nil {
		return nil, err
	}
	return webp, nil
}
