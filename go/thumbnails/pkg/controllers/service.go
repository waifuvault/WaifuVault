package controllers

import (
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/thumbnail"
)

type Service struct {
	ThumbnailService thumbnail.Service
}

func NewService(dao dao.Dao) *Service {
	thumbnailService := thumbnail.NewService(dao)

	return &Service{
		ThumbnailService: thumbnailService,
	}
}

func (s *Service) GetAllRoutes() []FSetupRoute {
	all := []FSetupRoute{}
	all = append(all, s.getAllThumbnailRoutes()...)

	return all
}
