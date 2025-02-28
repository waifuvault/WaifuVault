package thumbnail

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/davidbyttow/govips/v2/vips"
	"github.com/rs/zerolog/log"
	"github.com/samber/lo"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/utils"
	"image"
	"math/rand"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	globalRand      = rand.New(rand.NewSource(time.Now().UnixNano()))
	globalRandMu    sync.Mutex
	albumProcessing sync.Map
)

// globalFloat64 returns a random float64 in a thread-safe manner.
func globalFloat64() float64 {
	globalRandMu.Lock()
	defer globalRandMu.Unlock()
	return globalRand.Float64()
}

type Service interface {
	GenerateThumbnails(files []mod.FileEntry, album int) error
	GetAllSupportedExtensions() []string
	IsAlbumLoading(album int) bool
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

	for _, f := range vips.ImageTypes {
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

func (s *service) IsAlbumLoading(albumId int) bool {
	_, loaded := albumProcessing.Load(albumId)
	return loaded
}

func (s *service) GenerateThumbnails(files []mod.FileEntry, albumId int) error {
	if _, loaded := albumProcessing.LoadOrStore(albumId, true); loaded {
		return fmt.Errorf("albumId %d is already being processed", albumId)
	}
	// Ensure the processing flag is removed when done.
	defer albumProcessing.Delete(albumId)

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
					thumbnailBytes, err = generateImageThumbnail(file)
					if err != nil {
						log.Err(err).Msgf("failed to generate thumbnail for file %s", file.FullFileNameOnSystem)
						continue
					}
				} else if utils.IsVideo(file.MediaType) {
					thumbnailBytes, err = generateVideoThumbnail(file.FullFileNameOnSystem)
					if err != nil {
						log.Err(err).Msgf("failed to generate thumbnail for file %s", file.FullFileNameOnSystem)
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

	if len(thumbnailStructs) == 0 {
		return nil
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
	if err = json.Unmarshal(probeOut, &probe); err != nil {
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

func generateImageThumbnail(fileEntry mod.FileEntry) ([]byte, error) {
	file := utils.BaseUrl + "/" + fileEntry.FullFileNameOnSystem

	intSet := vips.IntParameter{}
	intSet.Set(-1)

	width, height, err := getResizedDimensions(file)
	if err != nil {
		return nil, err
	}

	vipsImage, err := vips.LoadThumbnailFromFile(
		file,
		width,
		height,
		vips.InterestingNone,
		vips.SizeDown,
		lo.Ternary(
			isAnimatedImage(fileEntry.Extension),
			&vips.ImportParams{
				NumPages: intSet,
			},
			vips.NewImportParams(),
		),
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

func getResizedDimensions(filePath string) (newWidth, newHeight int, err error) {
	// Open the image file.
	file, err := os.Open(filePath)
	if err != nil {
		return 0, 0, err
	}
	defer file.Close()

	// Decode only the image configuration (metadata) without reading the entire image.
	config, _, err := image.DecodeConfig(file)
	if err != nil {
		return 0, 0, err
	}

	origWidth := config.Width
	origHeight := config.Height

	if origWidth == 0 {
		return 0, 0, nil
	}

	// Fix the new width to 400 and calculate the scaling factor.
	newWidth = 400
	scaleFactor := float64(newWidth) / float64(origWidth)
	newHeight = int(float64(origHeight) * scaleFactor)

	return
}

func isAnimatedImage(extension string) bool {
	return extension == "gif" ||
		extension == "webp" ||
		extension == "heif"
}
