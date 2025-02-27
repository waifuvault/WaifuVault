package dao

import (
	"context"
	"encoding/base64"
	"fmt"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"gorm.io/gorm"
)

type ThumbnailDao interface {
	SaveThumbnails(thumbnails []mod.Thumbnail, tx ...*gorm.DB) ([]mod.Thumbnail, error)
}

func (d dao) SaveThumbnails(thumbnails []mod.Thumbnail, tx ...*gorm.DB) ([]mod.Thumbnail, error) {
	err := d.getDb(tx...).
		Create(&thumbnails).
		Error
	if err != nil {
		return nil, err
	}
	go d.storeRedis(thumbnails)
	return thumbnails, nil
}

func (d dao) storeRedis(thumbnails []mod.Thumbnail) {
	keyValuePairs := make(map[string][]byte, len(thumbnails))
	for _, thumbnail := range thumbnails {
		key := fmt.Sprintf("thumbnail:%d", thumbnail.FileId)
		value, err := base64.StdEncoding.DecodeString(thumbnail.Data)
		if err != nil {
			continue
		}
		keyValuePairs[key] = value
	}

	d.redisClient.MSet(context.Background(), keyValuePairs)
}
