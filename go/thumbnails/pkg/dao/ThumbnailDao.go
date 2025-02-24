package dao

import (
	"errors"
	"github.com/samber/lo"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"gorm.io/gorm"
)

type ThumbnailDao interface {
	HasThumbnail(fileIds []int, tx ...*gorm.DB) ([]int, error)
	SaveThumbnails(thumbnails []mod.Thumbnail, tx ...*gorm.DB) ([]mod.Thumbnail, error)
}

func (d dao) HasThumbnail(fileIds []int, tx ...*gorm.DB) ([]int, error) {
	// select fileId from mod.Thumbnail where fileIds id in fileId
	var res []mod.Thumbnail
	err := d.getDb(tx...).
		Model(&mod.Thumbnail{}).
		Select("fileId").
		Where("fileId IN (?)", fileIds).
		Find(&res).
		Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return []int{}, nil
	}

	return lo.Map(res, func(item mod.Thumbnail, index int) int {
		return item.FileId
	}), nil
}

func (d dao) SaveThumbnails(thumbnails []mod.Thumbnail, tx ...*gorm.DB) ([]mod.Thumbnail, error) {
	err := d.getDb(tx...).
		Create(&thumbnails).
		Error
	return thumbnails, err
}
