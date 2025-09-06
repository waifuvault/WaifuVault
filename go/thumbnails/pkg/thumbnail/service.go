package thumbnail

import (
	"errors"
	"fmt"
	"mime/multipart"
	"time"

	"github.com/cespare/xxhash/v2"
	"github.com/davidbyttow/govips/v2/vips"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dto"
	"golang.org/x/net/context"
)

type Service interface {
	GenerateThumbnails(files []dto.FileEntryDto, album int) error
	GenerateThumbnail(header *multipart.FileHeader, animate bool) ([]byte, error)
	GenerateThumbnailByToken(fileToken uuid.UUID, animate bool) ([]byte, error)
	GetAllSupportedExtensions() []string
	IsAlbumLoading(album int) bool
}

type service struct {
	dao           dao.Dao
	processor     Processor
	ffmpegFormats []string
	supportedExts []string
	redisClient   *redis.Client
}

func NewService(daoService dao.Dao, rdb *redis.Client) Service {
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
		redisClient:   rdb,
	}
}

// GetAllSupportedExtensions returns a list of all supported file extensions
func (s service) GetAllSupportedExtensions() []string {
	return append(s.ffmpegFormats, s.supportedExts...)
}

// IsAlbumLoading checks if an album is currently being processed
func (s service) IsAlbumLoading(albumId int) bool {
	_, loaded := albumProcessing.Load(albumId)
	return loaded
}

// GenerateThumbnails processes a batch of files to generate thumbnails
func (s service) GenerateThumbnails(files []dto.FileEntryDto, albumId int) error {
	bulkBatchProcessor := NewBatchProcessor(s.dao, s.processor, files, albumId)
	return bulkBatchProcessor.Process()
}

func (s service) GenerateThumbnail(header *multipart.FileHeader, animate bool) ([]byte, error) {
	if !s.processor.SupportsMultipartFile(header) {
		return nil, fmt.Errorf("unsupported file type: %s", header.Header.Get("Content-Type"))
	}

	cacheKey, err := s.generateCacheKeyForMultipart(header, animate)
	if err != nil {
		log.Error().Err(err).Msg("failed to generate cache key")
	}

	if thumbnail := s.getThumbnailFromCache(cacheKey); thumbnail != nil {
		return thumbnail, nil
	}

	thumbnail, err := s.processMultipartFile(header, animate)
	if err != nil {
		return nil, err
	}

	if cacheKey != "" {
		s.storeThumbnailInCache(cacheKey, thumbnail, time.Minute*10)
	}

	return thumbnail, nil
}

func (s service) GenerateThumbnailByToken(fileToken uuid.UUID, animate bool) ([]byte, error) {
	cacheKey := fmt.Sprintf("%s:%s", fileToken.String(), s.getAnimateKey(animate))

	if thumbnail := s.getThumbnailFromCache(cacheKey); thumbnail != nil {
		return thumbnail, nil
	}

	fileEntryModel, err := s.dao.GetFileEntry(fileToken)
	if err != nil {
		return nil, fmt.Errorf("file not found: %w", err)
	}

	fileEntryDto := dto.FromModel(*fileEntryModel)

	if !s.processor.SupportsFile(fileEntryDto) {
		return nil, fmt.Errorf("unsupported file type: %s", fileEntryDto.MediaType)
	}

	thumbnail, err := s.processor.GenerateThumbnail(fileEntryDto, animate)
	if err != nil {
		return nil, err
	}

	s.storeThumbnailInCache(cacheKey, thumbnail, time.Hour*24*365)
	return thumbnail, nil
}

func (s service) getThumbnailFromCache(key string) []byte {
	result, err := s.redisClient.Get(context.Background(), key).Bytes()
	if err != nil {
		if !errors.Is(err, redis.Nil) {
			log.Error().Err(err).Str("key", key).Msg("failed to get thumbnail from Redis")
		}
		return nil
	}
	return result
}

func (s service) storeThumbnailInCache(key string, thumbnail []byte, ttl time.Duration) {
	_, err := s.redisClient.Set(context.Background(), key, thumbnail, ttl).Result()
	if err != nil {
		log.Error().Err(err).Str("key", key).Msg("failed to store thumbnail in Redis")
	}
}

func (s service) getAnimateKey(animate bool) string {
	if animate {
		return "animated"
	}
	return "static"
}

func (s service) generateCacheKeyForMultipart(header *multipart.FileHeader, animate bool) (string, error) {
	file, err := header.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	fileHash := s.calculatePartialFileHash(file, header)
	return fmt.Sprintf("hash:%s:%s", fileHash, s.getAnimateKey(animate)), nil
}

func (s service) calculatePartialFileHash(file multipart.File, header *multipart.FileHeader) string {
	hasher := xxhash.New()

	hasher.WriteString(header.Filename)
	hasher.WriteString(fmt.Sprintf("%d", header.Size))

	const hashBytes = 32 * 1024
	buffer := make([]byte, hashBytes)
	n, _ := file.Read(buffer)
	hasher.Write(buffer[:n])

	return fmt.Sprintf("%x", hasher.Sum64())
}

func (s service) processMultipartFile(header *multipart.FileHeader, animate bool) ([]byte, error) {
	file, err := header.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	return s.processor.GenerateThumbnailFromMultipart(file, header, animate)
}
