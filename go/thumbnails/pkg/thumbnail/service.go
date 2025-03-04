package thumbnail

import (
	"github.com/davidbyttow/govips/v2/vips"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
)

type Service interface {
	GenerateThumbnails(files []mod.FileEntry, album int) error
	GetAllSupportedExtensions() []string
	IsAlbumLoading(album int) bool
}

type service struct {
	dao           dao.Dao
	processor     Processor
	ffmpegFormats []string
	supportedExts []string
}

func NewService(daoService dao.Dao) Service {
	// Initialize vips library
	vips.Startup(&vips.Config{})
	vips.LoggingSettings(nil, vips.LogLevelError)

	// Get supported ffmpeg videoFormats
	videoFormats, err := getFfmpegSupportedVideoFormats()
	if err != nil {
		panic(err)
	}

	// Pre-compute supported extensions
	imageFormats := getSupportedImageFormats()

	// Create the thumbnailProcessor
	thumbnailProcessor := NewProcessor(videoFormats, imageFormats)

	return &service{
		dao:           daoService,
		processor:     thumbnailProcessor,
		ffmpegFormats: videoFormats,
		supportedExts: imageFormats,
	}
}

// GetAllSupportedExtensions returns a list of all supported file extensions
func (s *service) GetAllSupportedExtensions() []string {
	return append(s.ffmpegFormats, s.supportedExts...)
}

// IsAlbumLoading checks if an album is currently being processed
func (s *service) IsAlbumLoading(albumId int) bool {
	_, loaded := albumProcessing.Load(albumId)
	return loaded
}

// GenerateThumbnails processes a batch of files to generate thumbnails
func (s *service) GenerateThumbnails(files []mod.FileEntry, albumId int) error {
	bulkBatchProcessor := NewBatchProcessor(s.dao, s.processor, files, albumId)
	return bulkBatchProcessor.Process()
}
