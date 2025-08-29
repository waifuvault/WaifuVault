package mod

import "time"

type Thumbnail struct {
	Id        *int      `json:"id" gorm:"column:id"`
	Data      string    `json:"thumbnail" gorm:"column:data"`
	FileId    int       `json:"fileId" gorm:"column:fileId"`
	UpdatedAt time.Time `json:"updatedAt" gorm:"column:updatedAt"`
	CreatedAt time.Time `json:"createdAt" gorm:"column:createdAt"`
}

func (t *Thumbnail) TableName() string {
	return "thumbnail_cache_model"
}
