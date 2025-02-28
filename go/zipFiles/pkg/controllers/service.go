package controllers

import (
	"github.com/waifuvault/WaifuVault/zipfiles/pkg/zip"
)

type Service struct {
	ZipService zip.Service
}

func NewService() *Service {
	zipService := zip.NewService()

	return &Service{
		ZipService: zipService,
	}
}

func (s *Service) GetAllRoutes() []FSetupRoute {
	all := []FSetupRoute{}
	all = append(all, s.getAllZipRoutes()...)

	return all
}
