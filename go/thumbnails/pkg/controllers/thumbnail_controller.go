package controllers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/wapimod"
)

func (s *Service) getAllThumbnailRoutes() []FSetupRoute {
	return []FSetupRoute{
		s.setupGenerateThumbnailsRoute,
		s.setupGetAllSupportedExtensionsRoute,
	}
}

func (s *Service) setupGetAllSupportedExtensionsRoute(routeGroup fiber.Router) {
	routeGroup.Get("/generateThumbnails/supported", s.getAllSupportedExtensionsRoute)
}

func (s *Service) getAllSupportedExtensionsRoute(ctx *fiber.Ctx) error {
	fileTypes := s.ThumbnailService.GetAllSupportedExtensions()

	return ctx.Status(fiber.StatusOK).JSON(fileTypes)
}

func (s *Service) setupGenerateThumbnailsRoute(routeGroup fiber.Router) {
	routeGroup.Post("/generateThumbnails", s.generateThumbnails)
}

func (s *Service) generateThumbnails(ctx *fiber.Ctx) error {
	var thumbnailEntries []mod.FileEntry
	if err := ctx.BodyParser(&thumbnailEntries); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(wapimod.NewApiError("invalid payload", err))
	}
	go func() {
		err := s.ThumbnailService.GenerateThumbnails(thumbnailEntries)
		if err != nil {
			log.Error().Err(err).Msg("error generating thumbnails")
		}
	}()
	return ctx.Status(fiber.StatusOK).JSON(wapimod.NewApiResult("", true))
}
