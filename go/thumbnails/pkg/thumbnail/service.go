package thumbnail

import (
	"encoding/base64"
	"github.com/davidbyttow/govips/v2/vips"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/utils"
	"strings"
	"sync"
)

type Service interface {
	GenerateThumbnails(files []mod.FileEntry) error
	GetAllSupportedImageExtensions() map[vips.ImageType]string
}

type service struct {
	dao         dao.Dao
	redisClient *redis.Client
}

func NewService(daoService dao.Dao, rdb *redis.Client) Service {
	vips.Startup(&vips.Config{})
	return &service{
		daoService,
		rdb,
	}
}

func (s *service) GetAllSupportedImageExtensions() map[vips.ImageType]string {
	return vips.ImageTypes
}

func (s *service) fileSupported(file mod.FileEntry) bool {
	if utils.IsImage(file.MediaType) {
		for _, ext := range s.GetAllSupportedImageExtensions() {
			lower := strings.ToLower(file.Extension)
			if lower == "jpg" || strings.ToLower(ext) == lower {
				return true
			}
		}
	} else if utils.IsVideo(file.MediaType) {
		return false
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

func generateVideoThumbnail(system string) ([]byte, error) {
	return nil, nil
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

	bytes, _, err := image.ExportNative()
	if err != nil {
		return nil, err
	}
	return bytes, nil
}
