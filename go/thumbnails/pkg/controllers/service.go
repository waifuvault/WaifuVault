package controllers

import (
	"github.com/redis/go-redis/v9"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/thumbnail"
)

type Service struct {
	ThumbnailService thumbnail.Service
}

func NewService(dao dao.Dao, rdb *redis.Client) *Service {
	thumbnailService := thumbnail.NewService(dao, rdb)

	return &Service{
		ThumbnailService: thumbnailService,
	}
}

func (s *Service) GetAllRoutes() []FSetupRoute {
	all := []FSetupRoute{}
	all = append(all, s.getAllThumbnailRoutes()...)
	all = append(all, s.getAllSystemRoutes()...)

	return all
}
