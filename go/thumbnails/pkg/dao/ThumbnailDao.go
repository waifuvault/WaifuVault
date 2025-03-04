package dao

import (
	"context"
	"encoding/base64"
	"fmt"
	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"gorm.io/gorm"
	"time"
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
	go func() {
		err := d.storeRedis(thumbnails)
		if err != nil {
			log.Error().Err(err).Msg("failed to store thumbnails in Redis")
		}
	}()
	return thumbnails, nil
}

func (d dao) storeRedis(thumbnails []mod.Thumbnail) error {
	keyValuePairs := make(map[string]interface{}, len(thumbnails))
	for _, thumbnail := range thumbnails {
		key := fmt.Sprintf("thumbnail:%d", thumbnail.FileId)
		value, err := base64.StdEncoding.DecodeString(thumbnail.Data)
		if err != nil {
			log.Error().Err(err).Int("fileId", thumbnail.FileId).Msg("failed to decode thumbnail data")
			continue
		}
		keyValuePairs[key] = value
	}

	if len(keyValuePairs) == 0 {
		log.Warn().Msg("no valid thumbnails to store in Redis")
		return nil
	}

	_, err := d.redisClient.MSet(context.Background(), keyValuePairs).Result()
	if err != nil {
		log.Error().Err(err).Msg("failed to store thumbnails in Redis")
		return err
	}

	// Set expiration for each key
	var expireErrors []error
	for key := range keyValuePairs {
		success, err := d.redisClient.Expire(context.Background(), key, time.Hour*24*365).Result()
		if err != nil {
			expireErrors = append(expireErrors, err)
		} else if !success {
			expireErrors = append(expireErrors, fmt.Errorf("key %s does not exist", key))
		}
	}

	if len(expireErrors) > 0 {
		return fmt.Errorf("failed to set expiration for %d keys", len(expireErrors))
	}

	return nil
}
