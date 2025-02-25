package dao

import (
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
	return thumbnails, err
}
