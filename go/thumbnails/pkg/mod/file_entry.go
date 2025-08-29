package mod

import "github.com/google/uuid"

type FileEntry struct {
	Id        int       `json:"id" gorm:"column:id;primary_key;auto_increment"`
	MediaType string    `json:"mediaType" gorm:"column:mediaType"`
	Extension string    `json:"extension" gorm:"column:fileExtension"`
	FileName  string    `json:"fileName" gorm:"column:fileName"`
	Token     uuid.UUID `json:"token" gorm:"column:token"`
}

func (f FileEntry) TableName() string {
	return "file_upload_model"
}

func (f FileEntry) FullFileNameOnSystem() string {
	if f.Extension != "" {
		return f.FileName + "." + f.Extension
	}
	return f.FileName
}
