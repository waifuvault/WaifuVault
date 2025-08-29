package dto

import "github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"

// FileEntryDto represents a file entry for thumbnail generation
type FileEntryDto struct {
	Id                   int    `json:"id" example:"1" validate:"required" description:"Unique identifier for the file"`
	FullFileNameOnSystem string `json:"fileOnDisk" example:"uploads/image.jpg" validate:"required" description:"Path to the file on the server"`
	MediaType            string `json:"mediaType" example:"image/jpeg" validate:"required" description:"MIME type of the file"`
	Extension            string `json:"extension" example:"jpg" validate:"required" description:"File extension"`
}

func FromModel(model mod.FileEntry) FileEntryDto {
	return FileEntryDto{
		Id:                   model.Id,
		FullFileNameOnSystem: model.FullFileNameOnSystem(),
		MediaType:            model.MediaType,
		Extension:            model.Extension,
	}
}
