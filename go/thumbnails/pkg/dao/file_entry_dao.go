package dao

import (
	"github.com/google/uuid"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"gorm.io/gorm"
)

type FileEntryDao interface {
	GetFileEntry(token uuid.UUID, tx ...*gorm.DB) (*mod.FileEntry, error)
}

func (d dao) GetFileEntry(token uuid.UUID, tx ...*gorm.DB) (*mod.FileEntry, error) {
	var fileEntry mod.FileEntry
	err := d.getDb(tx...).
		Model(&fileEntry).
		Where("token = ?", token).
		First(&fileEntry).
		Error
	if err != nil {
		return nil, err
	}
	return &fileEntry, nil
}
